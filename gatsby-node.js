const path = require("path")
const { createFilePath } = require("gatsby-source-filesystem")
const { fmImagesToRelative } = require("gatsby-remark-relative-images")

exports.createPages = async ({ actions, graphql, reporter }) => {
  const { createPage } = actions

  const result = await graphql(`
    {
      allMarkdownRemark(limit: 1000) {
        edges {
          node {
            id
            fields {
              slug
            }
            frontmatter {
              tags
              templateKey
            }
          }
        }
      }
    }
  `)

  if (result.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`)
    return
  }

  const posts = result.data.allMarkdownRemark.edges

  posts.forEach(edge => {
    const id = edge.node.id
    createPage({
      path: edge.node.fields.slug,
      tags: edge.node.frontmatter.tags,
      component: path.resolve(
        `src/templates/${String(edge.node.frontmatter.templateKey)}.js`
      ),
      // additional data can be passed via context
      context: {
        id,
      },
    })
  })

  //   let tags = []

  //   posts.forEach(edge => {
  //     if (_.get(edge, `node.frontmatter.tags`)) {
  //       tags = tags.concat(edge.node.frontmatter.tags)
  //     }
  //   })

  //   // Eliminate duplicate tags
  //   tags = _.uniq(tags)

  //   tags.forEach(tag => {
  //     const tagPath = `/tags/${_.kebabCase(tag)}/`

  //     createPage({
  //       path: tagPath,
  //       component: path.resolve(`src/templates/tags.js`),
  //       context: {
  //         tag,
  //       },
  //     })
  //   })

  //   result.data.allMarkdownRemark.edges.forEach(({ node }) => {
  //     createPage({
  //       path: node.frontmatter.path,
  //       component: blogPostTemplate,
  //       context: {}, // additional data can be passed via context
  //     })
  //   })
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  fmImagesToRelative(node) // convert image paths for gatsby images

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}
