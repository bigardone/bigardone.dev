/* eslint-disable import/no-extraneous-dependencies */
import '../css/index.css';
import Head from 'next/head';
import ReactGA from 'react-ga';
import CookieConsent from 'react-cookie-consent';
import { React } from 'react';
import Layout from '../components/layout';
import { Config } from '../src/pageUtils';

function MyApp({ Component, pageProps }) {
  const title = pageProps.title ? pageProps.title : Config.title;

  if (typeof window !== 'undefined') {
    ReactGA.initialize('UA-33087017-2');
    ReactGA.pageview(window.location.pathname + window.location.search);
  }

  return (
    <Layout>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{`${title} | ${Config.site_name}`}</title>
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

        {pageProps.post && (
          <>
            <meta property="og:type" content="article" key="og:type" />
            <meta
              property="og:image"
              content={pageProps.post.frontmatter.image}
              key="og:image"
            />
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
            "image": ["${pageProps.post.frontmatter.image}"],
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


        <link rel="stylesheet" media="screen" href="https://fonts.googleapis.com/css?family=Montserrat:400,500|Raleway:400,500&display=optimal" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>

      <Component {...pageProps} />

      <CookieConsent
        location="bottom"
        buttonText="Aceptar"
        cookieName="cookieConsent"
        style={{ background: '#E5E7EB', color: '#374151', fontSize: '0.85rem' }}
        buttonStyle={{
          background: 'transparent',
          border: '1px solid #e74c3c',
          color: '#e74c3c',
        }}
        expires={150}
      >
        This site uses its own and third-party cookies to improve your browsing experience and perform analytical tasks.
        {' '}
        <a
          aria-label="learn more about cookies"
          role="button"
          tabIndex="0"
          className="cc-link"
          href="https://cookiesandyou.com"
          rel="noopener noreferrer nofollow"
          target="_blank"
          style={{
            color: '#e74c3c', textDecoration: 'underline',
          }}
        >
          Learn more
        </a>
      </CookieConsent>
    </Layout>
  );
}

export default MyApp;
