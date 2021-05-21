/* eslint-disable import/no-extraneous-dependencies */
// import { DiscussionEmbed } from 'disqus-react';
import fs from 'fs';
import gfm from 'remark-gfm';
import matter from 'gray-matter';
import path from 'path';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter';
import nord from 'react-syntax-highlighter/dist/cjs/styles/hljs/nord';
import PostMeta from '../../../../../components/postMeta';
import Share from '../../../../../components/share';
import {
  filenameToParams, Config, formatDate, calculateReadingTime, slugToPath,
} from '../../../../../src/pageUtils';

const CodeBlock = ({ language, value }) => (
  <SyntaxHighlighter
    language={language}
    style={nord}
    customStyle={{ fontFamily: 'Fira Code' }}
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
    <section className="mx-auto mt-20 font-sans prose prose-purple">
      <header className="mb-10">
        <h1 className="mb-4 font-black">{title}</h1>
        <div className="mb-4 text-xl text-gray-500">{excerpt}</div>
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
          rehypePlugins={[rehypeRaw]}
        />
      </article>
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
    .readFileSync(path.join('blog', `${slugToPath(year, month, day, slug)}.md`))
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
