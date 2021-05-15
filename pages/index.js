/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import matter from 'gray-matter';
import Image from 'next/image';
import {
  filenameToSlug, formatDate, calculateReadingTime,
} from '../src/pageUtils';
import PostCard from '../components/postCard';
import Heading from '../components/heading';


export default function IndexPage({ posts }) {
  return (
    <div className="py-20 font-sans">
      <section className="w-full max-w-6xl mx-auto grid grid-flow-row grid-cols-2 gap-4">
        <div className="text-xl leading-relaxed text-gray-700">
          <p className="font-black">
            Hi, how are you doing? I'm Ricardo.
          </p>
          <h1 className="my-8 text-4xl font-black text-purple-1000">
            I'm a full-stack web developer.
          </h1>
          <p>
            I love building
            web applications using modern technologies such as
            {' '}
            <strong>Elixir</strong>
          ,
            {' '}
            <strong>Phoenix</strong>
            {' '}
          and
            {' '}
            <strong>Elm</strong>
          , and sharing my coding experience in this blog.
            <br />
            Welcome to my site.
          </p>
        </div>
        <div className="text-right">
          <Image
            src="/images/bigardone.svg"
            width={400}
            height={400}
            priority
            alt="bigardone.dev"
            unoptimized
          />
        </div>
      </section>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
        <path fill="#F5F3FF" fillOpacity="1" d="M0,192L30,202.7C60,213,120,235,180,240C240,245,300,235,360,218.7C420,203,480,181,540,160C600,139,660,117,720,112C780,107,840,117,900,138.7C960,160,1020,192,1080,181.3C1140,171,1200,117,1260,122.7C1320,128,1380,192,1410,224L1440,256L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z" />
      </svg>
      <section className="bg-purple-50">
        <div className="max-w-6xl mx-auto">
          <Heading text="Latest articles" />
          <div className="grid grid-flow-row grid-cols-2 gap-8">
            {
              posts.map(({ frontmatter, slug }) => (
                <PostCard key={slug} frontmatter={frontmatter} slug={slug} />
              ))
            }
            <div>
              <a href="/blog" className="block p-8 font-black text-center text-purple-900 bg-purple-200 rounded-lg shadow-custom">
                View more articles
              </a>
            </div>
          </div>
        </div>
      </section>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
        <path fill="#F5F3FF" fillOpacity="1" d="M0,192L30,202.7C60,213,120,235,180,240C240,245,300,235,360,218.7C420,203,480,181,540,160C600,139,660,117,720,112C780,107,840,117,900,138.7C960,160,1020,192,1080,181.3C1140,171,1200,117,1260,122.7C1320,128,1380,192,1410,224L1440,256L1440,0L1410,0C1380,0,1320,0,1260,0C1200,0,1140,0,1080,0C1020,0,960,0,900,0C840,0,780,0,720,0C660,0,600,0,540,0C480,0,420,0,360,0C300,0,240,0,180,0C120,0,60,0,30,0L0,0Z" />
      </svg>
      <section className="py-16">
        <div className="max-w-6xl mx-auto">
          <Heading text="Latest projects" />
        </div>
      </section>
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
    }).reverse().slice(0, 6);

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
