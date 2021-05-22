/* eslint-disable import/no-extraneous-dependencies */
import Image from 'next/image';
import Tags from './tags';

export default function ProjectCard({
  name, description, image, repoUrl, projectUrl, tags,
}) {
  let repoLink;

  if (repoUrl !== '') {
    repoLink = (
      <div>
        <a
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-row block text-sm text-gray-400 align-middle gap-1 hover:underline"
        >
          <Image
            src="/images/github.svg"
            width={12}
            height={12}
            priority
            alt="bigardone.dev"
            unoptimized
            className="text-purple-200"
          />
          View repository
        </a>
      </div>
    );
  }
  return (
    <article key={name} className="relative rounded-lg box-content rbg-white shadow-custom hover:shadow-custom-hover duration-300 transition-shadow">
      <div className="relative overflow-hidden bg-purple-400 border-b border-gray-100 rounded-t-lg h-44">
        <Image
          src={image}
          layout="fill"
          objectFit="cover"
          objectPosition="top"
          unoptimized
          className="z-0 h-40"
          alt="Project image"
        />
      </div>

      <div className="p-8">
        <header className="mb-4">
          <a href={projectUrl} target="_blank" rel="noopener noreferrer">
            <h2 className="mb-1 font-sans text-xl font-black hover:underline hover:text-purple-1000">
              {name}
            </h2>
          </a>
          {repoLink}
        </header>
        <p className="mb-2 text-base text-gray-500">{description}</p>
        <div className="inline-block mb-4 text-xs">
          <Tags tags={tags} />
        </div>
      </div>
    </article>
  );
}
