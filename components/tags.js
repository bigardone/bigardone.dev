export default function Tags({ tags }) {
  let taglist = [];

  if (typeof tags === 'string') taglist = tags.split(',');
  else if (tags instanceof Array) taglist = tags;
  else taglist = [];

  const tagNodes = taglist.map(tag => (
    <div
      key={tag.trim()}
      className="p-2 mb-2 mr-2 bg-gray-100 rounded-md"
    >
      {tag.trim()}
    </div>
  ));

  return (
    <div className="flex flex-wrap mt-2 text-xs">
      {tagNodes}
    </div>
  );
}
