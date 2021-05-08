import Tags from './tags';

export default function PostMeta({
  date, readingTime, tags,
}) {
  return (
    <div className="text-sm text-gray-500">
      {date}
      {' '}
·
      {' '}
      {readingTime}
      <Tags tags={tags} />
    </div>
  );
}
