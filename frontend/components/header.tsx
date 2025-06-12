import React, { useState } from "react";
import { Bot } from "lucide-react";

function Header() {
  const [activeSection, setActiveSection] = useState("about");

  return (
    <nav className="container mx-auto px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot className="h-8 w-8 text-brand-accent" />
          <span className="text-xl font-bold text-primary">
            dev@loxosceles.me
          </span>
        </div>
        <div className="hidden md:flex space-x-8">
          {["about", "projects", "skills", "contact"].map((section) => (
            <button
              key={section}
              onClick={(e) => {
                e.preventDefault();
                setActiveSection(section);
                document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
              }} 
              className={`capitalize transition-colors duration-200 pb-1 ${
                activeSection === section
                  ? "text-brand-accent border-b-2 border-brand-accent"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
export default Header;
