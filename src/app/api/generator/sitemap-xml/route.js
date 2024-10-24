import { NextRequest } from "next/server";

const SITEMAP_HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;
const SITEMAP_FOOTER = `</urlset>`;
const IGNORED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".pdf",
  ".css",
  ".js",
  ".ico",
];

const encoder = new TextEncoder();

/**
 *
 * @param {NextRequest} req
 * @returns
 */
export async function GET(req) {
  const requestUrl = new URL(req.url);
  const _url = Object.fromEntries(requestUrl.searchParams).url;

  if (typeof _url !== "string") {
    return new Response("Invalid URL", { status: 400 });
  }

  const url = decodeURIComponent(_url);

  const iterator = generateSitemapXML(url);

  const stream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(value));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Generates a sitemap in XML format starting from the given URL.
 *
 * @param {string} url - The base URL to start generating the sitemap.
 * @returns {AsyncGenerator<string>} An asynchronous generator that yields XML sitemap strings.
 */
async function* generateSitemapXML(url) {
  const queue = [url];
  const visited = new Set();

  yield SITEMAP_HEADER;

  while (queue.length > 0) {
    const currentPage = queue.shift();

    if (currentPage && !visited.has(currentPage)) {
      visited.add(currentPage);

      yield `\t<url>\n\t\t<loc>${currentPage}</loc>\n\t</url>\n`;

      const links = await getLinks(currentPage, url);
      queue.push(...links);

      // TODO: remove
      console.log("queue", queue);
    }
  }

  yield SITEMAP_FOOTER;
}

/**
 * Fetches the links from the given URL.
 *
 * @param {string} currentUrl - The URL to fetch links from.
 * @param {string} baseUrl - The base URL used for link parsing.
 * @returns {Promise<string[]>} A promise that resolves to an array of links found on the page.
 */
async function getLinks(currentUrl, baseUrl) {
  const links = [];
  try {
    const response = await fetch(currentUrl);

    if (!response.body) {
      console.error("ReadableStream is not supported");
      return links;
    }

    if (!response.headers.get("content-type")?.includes("text/html")) {
      console.error("Content type is not text/html");
      return links;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      // Read the stream in chunks
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the stream chunk to text and append to the buffer
      buffer += decoder.decode(value, { stream: true });

      // Process the buffer incrementally
      const newLinks = processBuffer(baseUrl, buffer);
      links.push(...newLinks);

      const lastIndex = buffer.lastIndexOf("<a");
      if (lastIndex !== -1) {
        buffer = buffer.slice(lastIndex);
      }
    }

    const newLinks = processBuffer(baseUrl, buffer);
    links.push(...newLinks);
    buffer = "";
  } catch (error) {
    console.error(`Failed to process page: ${currentUrl}`, error);
  }

  return links;
}

/**
 * Processes the buffer to extract links from anchor tags.
 *
 * @param {string} baseUrl - The base URL for link normalization.
 * @param {string} buffer - The buffer string to process for links.
 * @returns {string[]} An array of extracted links.
 */
function processBuffer(baseUrl, buffer) {
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g;
  let match;

  const links = [];

  while ((match = linkRegex.exec(buffer)) !== null) {
    const url = parseLink(match[1], baseUrl);
    if (url) {
      links.push(url);
    }
  }

  return links;
}

/**
 * Parses the given link to normalize it against the base URL.
 *
 * @param {string} link - The link to parse.
 * @param {string} baseUrl - The base URL for reference.
 * @returns {string|null} The normalized URL or null if invalid.
 */
function parseLink(link, baseUrl) {
  if (IGNORED_EXTENSIONS.some((ext) => link.endsWith(ext))) {
    return null;
  }

  const domain = getDomainFromUrl(baseUrl);

  try {
    const linkUrl = new URL(link, link.startsWith("/") ? domain : undefined);
    return linkUrl.hostname.replace(/^www\./, "") === domain
      ? new URL(linkUrl.pathname, baseUrl).href
      : null;
  } catch (e) {
    return null;
  }
}

/**
 * Extracts the domain from the given URL.
 *
 * @param {string} url - The URL to extract the domain from.
 * @returns {string} The domain of the URL without 'www.' prefix.
 */
function getDomainFromUrl(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}
