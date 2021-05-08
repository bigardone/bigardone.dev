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
    <article key={title} className="mb-8 cursor-pointer">
      <a href={`/blog/${slug}`}>
        <header className="mb-5">
          <h2 className="mb-3 font-sans text-2xl font-medium ">
            {title}
          </h2>
          <h3 className="text-lg text-gray-500">{excerpt}</h3>
        </header>
        <PostMeta
          date={date}
          size={10}
          readingTime={readingTime}
          tags={tags}
        />
      </a>
    </article>
  );
}
