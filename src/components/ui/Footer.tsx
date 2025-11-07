import { Twitter, Linkedin, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <div className="border-t border-neutral-700 pt-8 text-center text-gray-400 mb-6">
      <p className="mb-4">&copy; 2025 ThumbAI. All rights reserved.</p>

      <div className="flex justify-center space-x-6">
        <a
          href="https://x.com/J_srv001"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-400 transition-colors"
        >
          <Twitter className="w-5 h-5" />
        </a>
        <a
          href="https://linkedin.com/in/srvjha02"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-400 transition-colors"
        >
          <Linkedin className="w-5 h-5" />
        </a>
        <a
          href="mailto:jhasaurav0209001@gmail.com"
          className="text-gray-400 hover:text-blue-400 transition-colors"
        >
          <Mail className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
};
