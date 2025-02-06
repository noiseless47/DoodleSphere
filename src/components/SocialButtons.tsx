import { FaGithub, FaLinkedinIn, FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from "react-icons/fa6";

const SocialButtons = () => {
  return (
    <div className="flex items-center justify-center gap-3">
      <a
        href="https://github.com/noiseless47"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        title="GitHub"
      >
        <FaGithub size={16} />
      </a>
      <a
        href="https://linkedin.com/in/asishkumaryeleti"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        title="LinkedIn"
      >
        <FaLinkedinIn size={16} />
      </a>
      <a
        href="https://twitter.com/noiseless47"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        title="X (Twitter)"
      >
        <FaXTwitter size={16} />
      </a>
      <a
        href="https://discord.gg/YGXX4ue5eb" // Replace with your Discord invite link
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        title="Discord"
      >
        <FaDiscord size={16} />
      </a>
    </div>
  );
};

export default SocialButtons; 