import React from 'react';

import Layout from '../../components/layout';
import BlogList from '../../components/BlogList';

const BlogIndexPage = () => {
  return (
    <Layout>
      <div>
        <h1>Latest Articles</h1>
      </div>
      <section>
        <div>
          <BlogList /> /
        </div>
      </section>
    </Layout>
  );
};

export default BlogIndexPage;
