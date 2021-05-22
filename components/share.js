/* eslint-disable import/no-extraneous-dependencies */
import Image from 'next/image';

export default function Share({ text, url }) {
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="flex text-gray-400 share-links">
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on twitter"
        className="ml-4 share-links__button"
      >
        <Image
          src="/images/twitter.svg"
          width={20}
          height={20}
          priority
          alt="bigardone.dev"
          unoptimized
        />
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on linkedin"
        className="ml-4 share-links__button"
      >
        <Image
          src="/images/linkedin.svg"
          width={20}
          height={20}
          priority
          alt="bigardone.dev"
          unoptimized
        />
      </a>
    </div>
  );
}
