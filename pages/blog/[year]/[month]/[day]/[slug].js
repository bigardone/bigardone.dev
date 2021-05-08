/* eslint-disable import/no-extraneous-dependencies */
// import { DiscussionEmbed } from 'disqus-react';
import fs from 'fs';
import gfm from 'remark-gfm';
import matter from 'gray-matter';
import path from 'path';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import nord from 'react-syntax-highlighter/dist/cjs/styles/hljs/nord';
import PostMeta from '../../../../../components/postMeta';
import Share from '../../../../../components/share';
import Tags from '../../../../../components/tags';
import {
  filenameToParams, Config, formatDate, calculateReadingTime, slugToPath,
} from '../../../../../src/pageUtils';

const CodeBlock = ({ language, value }) => (
  <SyntaxHighlighter
    language={language}
    style={nord}
  >
    {value}
  </SyntaxHighlighter>
);

export default function Post({ post }) {
  const { content, frontmatter, slug } = post;
  const {
    title, date, tags, excerpt, readingTime,
  } = frontmatter;

  const url = `https://blog.talentoit.org/${slug}`;

  return (
    <section className="mx-auto prose prose-purple lg:prose-lg">
      <header className="mb-10">
        <h1 className="mb-4 text-6xl font-extrabold">{title}</h1>
        <div className="mb-4 text-2xl text-gray-500">{excerpt}</div>
        <div className="flex items-center justify-between">
          <PostMeta
            date={date}
            size={12}
            readingTime={readingTime}
            tags={tags}
          />
          <Share url={url} text={title} />
        </div>
      </header>
      <article className="mb-16 font-serif">
        <ReactMarkdown
          allowDangerousHtml
          escapeHtml={false}
          plugins={[gfm]}
          source={content}
          renderers={{ code: CodeBlock }}
        />
      </article>
      {/* <DiscussionEmbed */}
      {/*   shortname="talentoit" */}
      {/*   config={{ */}
      {/*     url, */}
      {/*     identifier: slug, */}
      {/*     title, */}
      {/*     language: 'es_ES', */}
      {/*   }} */}
      {/* /> */}
    </section>
  );
}

export async function getStaticPaths() {
  const files = fs.readdirSync('blog');
  const paths = files.map(filename => ({
    params: filenameToParams(filename),
  }));

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({
  params: {
    year, month, day, slug,
  },
}) {
  const markdownWithMetadata = fs
    .readFileSync(path.join('blog', `${slugToPath(year, month, day, slug)}.html.markdown`))
    .toString();

  const { data, content } = matter(markdownWithMetadata);


  const frontmatter = {
    ...data,
    date: formatDate(data.date),
    readingTime: calculateReadingTime(content),
  };

  return {
    props: {
      title: frontmatter.title,
      description: frontmatter.excerpt ? frontmatter.excerpt : Config.description,
      post: {
        slug,
        content,
        frontmatter,
      },
    },
  };
}
