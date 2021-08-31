/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import matter from 'gray-matter';
import Image from 'next/image';
import {
  filenameToSlug, formatDate, calculateReadingTime,
} from '../src/pageUtils';
import PostCard from '../components/postCard';
import ProjectCard from '../components/projectCard';
import Heading from '../components/heading';
import projects from '../data/projects';


export default function IndexPage({ latestArticles, latestProjects }) {
  return (
    <div className="mt-16 font-sans md:mt-32">
      <section className="w-full max-w-6xl px-4 mx-auto md:grid md:grid-flow-row md:grid-cols-2 md:gap-4">
        <div className="mb-6 text-xl leading-relaxed text-gray-700 md:mb-0">
          <p className="font-black">
            Hi, how are you doing? I'm Ricardo.
          </p>
          <h1 className="my-8 text-4xl font-black text-purple-1000">
            I'm a software engineer.
          </h1>
          <p className="mb-6">
            I love building
            web applications using modern technologies such as
            {' '}
            <strong>Elixir</strong>
            ,
            {' '}
            <strong>Phoenix</strong>
            ,
            {' '}
            and
            {' '}
            <strong>Elm</strong>
            {' '}
            and sharing my coding experience in this blog.
          </p>
          <p>
            Feel free to read any of my
            {' '}
            <a href="#latest_articles" className="font-black text-purple-700 hover:underline">latest articles</a>
            {' '}
            or take a look at my
            {' '}
            <a href="#recent_projects" className="font-black text-purple-700 hover:underline">recent projects</a>
            . I hope you enjoy them. 🙌
          </p>
        </div>
        <div className="flex flex-row justify-center w-auto md:justify-end">
          <div className="w-3/4 md:w-auto">
            <Image
              src="/images/bigardone.svg"
              width={400}
              height={400}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </div>
        </div>
      </section>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
        <path fill="#F5F3FF" fillOpacity="1" d="M0,192L30,202.7C60,213,120,235,180,240C240,245,300,235,360,218.7C420,203,480,181,540,160C600,139,660,117,720,112C780,107,840,117,900,138.7C960,160,1020,192,1080,181.3C1140,171,1200,117,1260,122.7C1320,128,1380,192,1410,224L1440,256L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z" />
      </svg>
      <section className="bg-purple-50" id="latest_articles">
        <div className="max-w-6xl px-4 mx-auto ">
          <Heading text="Latest articles" />
          <div className="grid grid-flow-row md:grid-cols-2 grid-cols-1 gap-8">
            {
              latestArticles.map(({ frontmatter, slug }) => (
                <PostCard key={slug} frontmatter={frontmatter} slug={slug} />
              ))
            }
            <div>
              <a href="/blog" className="block p-8 font-black text-center text-purple-900 bg-purple-200 rounded-lg shadow-custom hover:underline hover:shadow-custom-hover">
                View more articles
              </a>
            </div>
          </div>
        </div>
      </section>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
        <path fill="#F5F3FF" fillOpacity="1" d="M0,192L30,202.7C60,213,120,235,180,240C240,245,300,235,360,218.7C420,203,480,181,540,160C600,139,660,117,720,112C780,107,840,117,900,138.7C960,160,1020,192,1080,181.3C1140,171,1200,117,1260,122.7C1320,128,1380,192,1410,224L1440,256L1440,0L1410,0C1380,0,1320,0,1260,0C1200,0,1140,0,1080,0C1020,0,960,0,900,0C840,0,780,0,720,0C660,0,600,0,540,0C480,0,420,0,360,0C300,0,240,0,180,0C120,0,60,0,30,0L0,0Z" />
      </svg>
      <section className="max-w-6xl px-4 mx-auto " id="recent_projects">
        <Heading text="Recent projects" />
        <div className="grid grid-flow-row md:grid-cols-3 grid-cols-1 gap-8">
          {
            latestProjects.map(project => (
              <ProjectCard key={project.name} {...project} />
            ))
          }
        </div>
      </section>
    </div>
  );
}


export async function getStaticProps() {
  try {
    const files = fs.readdirSync(`${process.cwd()}/blog`);

    const latestArticles = files.map((filename) => {
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
        latestArticles,
        latestProjects: projects,
        title: 'Home',
      },
    };
  } catch (error) {
    return { props: { latestArticles: [], latestProjects: [] } };
  }
}
