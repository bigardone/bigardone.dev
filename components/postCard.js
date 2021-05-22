/* eslint-disable import/no-extraneous-dependencies */
import PostMeta from './postMeta';


export default function PostCard({
  frontmatter: {
    title, excerpt, date, readingTime, tags,
  },
  slug,
}) {
  if (!title) return false;

  return (
    <article key={title} className="p-8 bg-white rounded-lg cursor-pointer shadow-custom hover:shadow-custom-hover duration-300 transition-shadow">
      <a href={`/blog/${slug}`}>
        <header className="mb-5">
          <h2 className="mb-6 font-sans text-xl font-black hover:underline hover:text-purple-900">
            {title}
          </h2>
          <h3 className="text-base text-gray-500">{excerpt}</h3>
        </header>
        <div className="inline-block text-xs">
          <PostMeta
            date={date}
            size={10}
            readingTime={readingTime}
            tags={tags}
          />
        </div>
      </a>
    </article>
  );
}
