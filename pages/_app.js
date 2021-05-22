/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
import '@fontsource/fira-code';
import '@fontsource/montserrat';
import '@fontsource/montserrat/600.css';
import '../css/index.css';
import Head from 'next/head';
import { React } from 'react';
import Layout from '../components/layout';
import { Config } from '../src/pageUtils';

function MyApp({ Component, pageProps }) {
  const title = pageProps.title ? pageProps.title : Config.title;
  const image = pageProps.post ? pageProps.post.frontmatter.image : Config.metaImage;

  return (
    <Layout>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{`${title} · ${Config.site_name}`}</title>
        <meta
          name="description"
          content={pageProps.description ? pageProps.description : Config.description}
          key="description"
        />
        <meta name="author" content={Config.author} key="author" />
        <meta property="og:title" content={`${title} | ${Config.site_name}`} key="og:title" />
        <meta
          property="og:description"
          content={pageProps.description ? pageProps.description : Config.description}
          key="og:description"
        />
        <meta property="og:locale" content={Config.locale} key="og:locale" />
        <meta property="og:site_name" content={Config.site_name} key="og:site_name" />
        <meta property="og:image" content={image} key="og:image" />


        {pageProps.post && (
          <>
            <meta property="og:type" content="article" key="og:type" />
            <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
            <meta
              property="twitter:image"
              content={pageProps.post.frontmatter.image}
              key="twitter:image"
            />
            <meta
              property="article:published_time"
              content={pageProps.post.frontmatter.date}
              key="article:published_time"
            />
            <meta
              property="article:modified_time"
              content={pageProps.post.frontmatter.date}
              key="article:modified_time"
            />
            <script
              type="application/ld+json"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `
          {
            "description": "${pageProps.description ? pageProps.description : Config.description}",
            "author": {
              "@type": "Person",
              "name": "${Config.author}"
            },
            "@type": "BlogPosting",
            "url": "${Config.url}/${pageProps.post.slug}",
            "publisher": {
              "@type": "Organization",
              "logo": {
                "@type": "ImageObject",
                "url": "${Config.url}/blog-logo.svg"
              },
              "name": "${Config.author}"
            },
            "headline": "${pageProps.title} | ${Config.site_name}",
            "image": ["${image}"],
            "datePublished": "${pageProps.post.frontmatter.date}",
            "dateModified": "${pageProps.post.frontmatter.date}",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": "${Config.url}"
            },
            "@context": "http://schema.org"
          }`,
              }}
              key="ldjson"
            />
          </>
        )}
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      </Head>

      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
