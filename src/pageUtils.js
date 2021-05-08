export function filenameToSlug(filename) {
  const chunks = filename.replace('.html.markdown', '').split('-');
  return `${chunks.shift()}/${chunks.shift()}/${chunks.shift()}/${chunks.join('-')}`;
}

export function filenameToParams(filename) {
  const chunks = filename.replace('.html.markdown', '').split('-');

  return {
    year: chunks.shift(),
    month: chunks.shift(),
    day: chunks.shift(),
    slug: chunks.join('-'),
  };
}

export function slugToPath(year, month, day, slug) {
  return `${year}-${month}-${day}-${slug}`;
}

export const Config = {
  site_name: 'bigardone.dev',
  title: 'bigardone.dev',
  description: '',
  url: 'https://bigardone.dev',
  locale: 'en',
  author: 'Ricardo Garcia Vega',
  authorEmail: 'bigardone@gmail.com',
};

const formatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

export function formatDate(date) {
  if (date instanceof Date) return date.toLocaleDateString('es-ES', formatOptions);
  return new Date(date).toLocaleDateString('es-ES', formatOptions);
}

export function defaultAuthor() {
  return {
    name: Config.author,
    email: Config.authorEmail,
  };
}

export function calculateReadingTime(content) {
  const wordsPerMinute = 250; // Average case.
  let result;

  const textLength = content.split(' ').length; // Split by words
  if (textLength > 0) {
    const value = Math.ceil(textLength / wordsPerMinute);
    result = `${value} min read`;
  }

  return result;
}
