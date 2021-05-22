/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import matter from 'gray-matter';
import {
  filenameToSlug, formatDate, calculateReadingTime,
} from '../src/pageUtils';
import PostCard from '../components/postCard';
import Heading from '../components/heading';


export default function IndexPage({ posts }) {
  return (
    <section className="px-4 py-12 font-sans md:py-32 md:px-0">
      <div className="max-w-6xl mx-auto">
        <Heading text="Articles" />
        <div className="grid grid-flow-row grid-cols-1 md:grid-cols-2 gap-8">
          {
            posts.map(({ frontmatter, slug }) => (
              <PostCard key={slug} frontmatter={frontmatter} slug={slug} />
            ))
          }
        </div>
      </div>
    </section>
  );
}


export async function getStaticProps() {
  try {
    const files = fs.readdirSync(`${process.cwd()}/blog`);

    const posts = files.map((filename) => {
      const markdownWithMetadata = fs
        .readFileSync(`blog/${filename}`)
        .toString();

      const { data, content } = matter(markdownWithMetadata);


      const frontmatter = {
        ...data,
        date: formatDate(data.date),
        readingTime: calculateReadingTime(content),
      };

      return {
        slug: filenameToSlug(filename),
        frontmatter,
      };
    }).reverse();

    return {
      props: {
        posts,
        title: 'Home',
      },
    };
  } catch (error) {
    return { props: { posts: [] } };
  }
}
