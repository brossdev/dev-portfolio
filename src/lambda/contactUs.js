/**
 * Sends a question submitted from HTML question form via AWS SES.
 *
 * 1. Send question function validates and parses request created by
 *    submitting a form.
 * 2. Send email function calls AWS SES API with data from previous
 *    step.
 *
 * If there’s a user error, an HTTP redirect response to HTML question
 * form is generated. Successful invocation also ends with HTTP
 * redirect to HTML question form with `#fail` fragment.
 *
 * Configuration is via environment variable:
 *
 * - QUESTION_FORM_URL: URL of HTML question form
 * - QUESTION_FORM_FROM: email address from which question will be
 *   sent
 * - QUESTION_FORM_TO: email address to which question will be
 *   delivered
 * - QUESTION_FORM_SUBJECT: subject of email with question
 * - QUESTION_FORM_HONEYPOT (optional): honeypot field for bots
 * - MY_AWS_REGION
 * - MY_AWS_ACCESS_KEY_ID
 * - MY_AWS_SECRET_ACCESS_KEY
 */

console.log(process.env);

const AWS = require('aws-sdk');
const querystring = require('querystring');

const ses = new AWS.SES({
  region: process.env['GATSBY_AWS_REGION'],
  credentials: new AWS.Credentials(
    process.env['GATSBY_AWS_ACCESS_KEY_ID'],
    process.env['GATSBY_AWS_SECRET_ACCESS_KEY']
  ),
});

function parseContentType(headerValue) {
  return (headerValue || '').split(/;\s+/, 2)[0];
}

/**
 * Returns name encoded using syntax of encoded-words from MIME.
 *
 * This is a very lazy developer’s approach defaulting to BASE64
 * without trying anything else and shouldn’t be considered
 * production-ready. MIME suggests what to use when, get familiar with
 * or use some nice library.
 */
function mimeEncode(name) {
  return '=?utf-8?b?' + Buffer.from(name).toString('base64') + '?=';
}

function redir(code) {
  return {
    statusCode: 303,
    headers: {
      Location: process.env['QUESTIONFORMURL'] + (code ? `#${code}` : ''),
    },
  };
}

const sendQuestion = async (event, context) => {
  console.log({ event });
  if (event['httpMethod'] !== 'POST') {
    throw new Error(`Unexpected HTTP method "${event['httpMethod']}"`);
  }
  if (
    parseContentType(event['headers']['content-type']) !==
    'application/x-www-form-urlencoded'
  ) {
    throw new Error(
      `Unexpected content type "${event['headers']['content-type']}"`
    );
  }

  const params = querystring.parse(event['body']);

  if (
    process.env['QUESTIONFORMHONEYPOT'] &&
    params[process.env['QUESTIONFORMHONEYPOT']]
  ) {
    console.info('Bot trapped in honeypot');
    return;
  }

  const errs = [];
  if (!params['email']) errs.push('no-email');
  if (!params['message']) errs.push('no-message');
  if (errs.length > 0) return redir(errs.join(','));

  sendEmail(
    params['name']
      ? `${mimeEncode(params['name'])} <${params['email']}>`
      : params['email'],
    params['message']
  );
};

/**
 * Sends email via AWS SES API.
 */
function sendEmail(replyTo, text) {
  ses.sendEmail(
    {
      Source: process.env['QUESTIONFORMFROM'],
      Destination: {
        ToAddresses: [process.env['QUESTIONFORMTO']],
      },
      ReplyToAddresses: [replyTo],
      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: 'Testing Email - to come from form',
        },
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: text,
          },
        },
      },
    },
    (err, data) => {
      if (err) {
        console.error('Error while sending email via AWS SES:', err);
        return redir('fail');
      }

      redir('sent');
    }
  );
}

exports.handler = sendQuestion;
