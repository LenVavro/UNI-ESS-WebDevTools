"use client";

import { NavBar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Page() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const [url, setUrl] = useState("");
  const [sitemap, setSitemap] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");

  const handleGenerate = async () => {
    const response = await fetch(
      `/api/generator/sitemap-xml?url=${encodeURIComponent(url)}`,
    );

    if (!response.body) {
      console.error("ReadableStream is not supported");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sitemapContent = "";

    while (true) {
      const { done, value } = await reader.read(); // Read chunks
      if (done) break; // If no more data, exit the loop
      sitemapContent += decoder.decode(value, { stream: true }); // Decode and append each chunk
      setSitemap(sitemapContent);
    }
  };

  return (
    <div
      className={`${
        isDarkMode ? "bg-gray-900 text-gray-400" : "bg-gray-100 text-gray-800"
      } min-h-screen`}
    >
      <NavBar
        title="Sitemap XML Generator"
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      <main className="max-w-6xl m-auto w-full p-8">
        <div className="mt-10 space-y-4 text-center">
          <h1 className="text-5xl font-extrabold text-center">
            Sitemap XML Generator
          </h1>
          <p className="text-xl text-center font-medium">
            Just enter your website URL to create a sitemap
          </p>
        </div>

        <div className="flex items-stretch gap-2 mt-8">
          <Input
            placeholder="https://website-url.com"
            className="flex-grow text-lg h-auto"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <button
            // onClick={handleGenerateXmlSitemap}
            onClick={handleGenerate}
            className="px-4 py-2 bg-slate-100 rounded text-slate-950 font-medium"
          >
            Generate
          </button>
        </div>

        <div className="mt-8 max-w-full overflow-x-auto">
          <pre>{sitemap}</pre>
        </div>
      </main>
    </div>
  );
}
