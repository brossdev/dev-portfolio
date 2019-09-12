const AWS = require('aws-sdk');
const querystring = require('querystring');

const ses = new AWS.SES({
  region: process.env['NET_AWS_REGION'],
  accessKeyId: process.env['NET_AWS_ACCESS_KEY'],
  secretAccessKey: process.env['NET_AWS_SECRET_ACCESS_KEY'],
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
      Location: process.env['QUESTION_FORM_URL'] + (code ? `#${code}` : ''),
    },
  };
}

const sendQuestion = async (event, context) => {
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
  console.log({ params: params.message });

  if (
    process.env['QUESTION_FORM_HONEYPOT'] &&
    params[process.env['QUESTION_FORM_HONEYPOT']]
  ) {
    console.info('Bot trapped in honeypot');
    return;
  }

  const errs = [];
  if (!params['email']) errs.push('no-email');
  if (!params['message']) errs.push('no-message');
  if (errs.length > 0) return redir(errs.join(','));

  sendEmail(
    params.name ? `${mimeEncode(params.name)} <${params.email}>` : params.email,
    params.message
  );
};

function sendEmail(replyTo, text) {
  ses.sendEmail(
    {
      Source: process.env['QUESTION_FORM_FROM'],
      Destination: {
        ToAddresses: [process.env['QUESTION_FORM_TO']],
      },
      ReplyToAddresses: [replyTo],
      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: text,
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

      return redir('sent');
    }
  );
}

exports.handler = sendQuestion;
