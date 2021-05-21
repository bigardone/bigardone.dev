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
        <a href={projectUrl} target="_blank" rel="noopener noreferrer">View repository</a>
      </div>
    );
  }
  return (
    <article key={name} className="relative rounded-lg box-content rbg-white shadow-custom hover:shadow-custom-hover duration-300 transition-shadow">
      <div className="relative overflow-hidden bg-purple-400 rounded-t-lg h-44">
        <Image
          src={image}
          layout="fill"
          objectFit="cover"
          objectPosition="top"
          unoptimized
          className="z-0 h-6 filter grayscale h-44 opacity-60"
        />
      </div>

      <div className="p-8">
        <a href={projectUrl} target="_blank" rel="noopener noreferrer">
          <h2 className="mb-6 font-sans text-xl font-black hover:underline hover:text-purple-1000">
            {name}
          </h2>
        </a>
        <p className="mb-2 text-base text-gray-500">{description}</p>
        <div className="inline-block text-xs">
          <Tags tags={tags} />
        </div>
        {repoLink}
      </div>
    </article>
  );
}
