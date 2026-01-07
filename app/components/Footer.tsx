export default function Footer() {
  return (
    <footer className="border-t border-card-border bg-card-bg mt-auto">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm">
          <a
            href="https://www.vocabulary.com/resources/ipa-pronunciation/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:text-blue-900 dark:hover:text-[#60a5fa] hover:underline font-medium"
          >
            IPA Pronunciation Guide
          </a>
        </div>
      </div>
    </footer>
  );
}

