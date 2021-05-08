/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import matter from 'gray-matter';
import {
  filenameToSlug, formatDate, calculateReadingTime,
} from '../src/pageUtils';
import PostCard from '../components/postCard';


export default function IndexPage({ posts }) {
  return (
    <div className="font-serif">
      <div className="max-w-5xl mx-auto">
        {
          posts.map(({ frontmatter, slug }) => (
            <PostCard key={slug} frontmatter={frontmatter} slug={slug} />
          ))
        }
      </div>
    </div>
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
