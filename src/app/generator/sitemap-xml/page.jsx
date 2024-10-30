"use client";

import { NavBar } from "@/components/navbar";
import { cn, isUrlValid } from "@/lib/utils";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { CircularProgress } from "@mui/material";
import { useState } from "react";

export default function Page() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [url, setUrl] = useState("");
  const [sitemap, setSitemap] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");

  const handleGenerate = async () => {
    const isValid = isUrlValid(url);

    if (!isValid) {
      setError("Invalid URL");
      return;
    }

    setError("");
    setIsLoading(true);
    setSitemap("");
    setSitemapUrl("");

    try {
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

      setSitemapUrl(
        URL.createObjectURL(
          new Blob([sitemapContent], { type: "application/xml" }),
        ),
      );
    } catch (e) {
      console.error(e);
      setError("Ups, an error occurred while generating the sitemap");
    } finally {
      setIsLoading(false);
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

        <div>
          <div className="flex items-stretch gap-2 mt-8">
            <input
              placeholder="https://website.com"
              className={`${isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-slate-500" : "bg-slate-50 border-slate-200 text-slate-950 placeholder:text-slate-300"} focus-visible:outline-none flex w-full rounded-md border px-3 py-2 flex-grow text-lg h-auto placeholder:text-white/50`}
              value={url}
              disabled={isLoading}
              onChange={(e) => setUrl(e.target.value)}
            />

            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2"
              isDarkMode={isDarkMode}
            >
              <p>{isLoading ? "Generating" : "Generate"}</p>
            </Button>
          </div>

          {!!error && <p className="mt-2 text-red-500">{error}</p>}
        </div>

        {sitemap.length > 0 && (
          <div className="mt-8 max-w-full rounded-lg bg-slate-800 shadow-lg">
            <div className="p-4 border-b border-slate-700 flex items-center gap-4">
              {isLoading && (
                <CircularProgress
                  size="1.5rem"
                  color="inherit"
                  className="text-white"
                />
              )}
              <p className="font-mono text-white text-lg font-medium flex">
                sitemap.xml
              </p>

              {!isLoading && (
                <div className="flex items-stretch gap-1 ml-auto">
                  <a
                    href={sitemapUrl}
                    download="sitemap.xml"
                    target="_blank"
                    className="bg-slate-700 text-slate-200 px-4 py-2 rounded font-medium"
                  >
                    <p>Download</p>
                  </a>
                  <Button
                    onClick={() => navigator.clipboard.writeText(sitemap)}
                    className="bg-slate-700 text-slate-200 flex items-center"
                  >
                    <ContentCopyIcon className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
            <pre className="font-mono text-sm overflow-x-auto text-slate-300 p-4">
              {sitemap}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}

function Button({ children, className, isDarkMode, ...props }) {
  return (
    <button
      {...props}
      className={cn(
        `${isDarkMode ? "bg-slate-100 text-slate-950" : "bg-slate-800 text-slate-100"} disabled:opacity-60 px-4 py-2 rounded font-medium`,
        className,
      )}
    >
      {children}
    </button>
  );
}
