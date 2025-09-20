import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AISearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const inputRef = useRef(null);

  const aiSuggestions = [
    {
      id: 1,
      text: "handwoven textiles from Rajasthan",
      category: "Textiles",
      region: "Rajasthan",
      icon: "Shirt"
    },
    {
      id: 2,
      text: "wooden sculptures under ₹5000",
      category: "Sculptures",
      priceRange: "Under ₹5000",
      icon: "TreePine"
    },
    {
      id: 3,
      text: "pottery with traditional patterns",
      category: "Pottery",
      style: "Traditional",
      icon: "Coffee"
    },
    {
      id: 4,
      text: "jewelry made by verified artisans",
      category: "Jewelry",
      verified: true,
      icon: "Gem"
    },
    {
      id: 5,
      text: "eco-friendly bamboo crafts",
      category: "Eco-friendly",
      material: "Bamboo",
      icon: "Leaf"
    },
    {
      id: 6,
      text: "leather goods from Gujarat",
      category: "Leather",
      region: "Gujarat",
      icon: "Briefcase"
    }
  ];

  useEffect(() => {
    if (query?.length > 2) {
      const filtered = aiSuggestions?.filter(suggestion =>
        suggestion?.text?.toLowerCase()?.includes(query?.toLowerCase()) ||
        suggestion?.category?.toLowerCase()?.includes(query?.toLowerCase()) ||
        (suggestion?.region && suggestion?.region?.toLowerCase()?.includes(query?.toLowerCase()))
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(aiSuggestions?.slice(0, 4));
      setShowSuggestions(query?.length === 0 && document.activeElement === inputRef?.current);
    }
  }, [query]);

  const handleSearch = async (searchQuery = query) => {
    if (searchQuery?.trim()) {
      setIsSearching(true);
      setSearchResults(null);
      setShowSuggestions(false);
      inputRef?.current?.blur();
      
      // Simulate AI processing delay
      setTimeout(() => {
        setIsSearching(false);
        setSearchResults({
          suggestion: `Based on your query "${searchQuery}", I recommend handwoven textiles with traditional patterns, perfect for wedding gifts.`,
          products: ['Traditional Handwoven Scarf', 'Wedding Ceremony Textile', 'Artisan Silk Fabric']
        });
      }, 2000);
      
      onSearch?.(searchQuery?.trim());
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion?.text);
    handleSearch(suggestion?.text);
  };

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      setQuery(transcript);
      handleSearch(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition?.start();
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter') {
      handleSearch();
    } else if (e?.key === 'Escape') {
      setShowSuggestions(false);
      inputRef?.current?.blur();
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <Icon name="Search" size={20} className="text-muted-foreground" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e?.target?.value)}
          onKeyDown={handleKeyPress}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Ask AI: 'Find handwoven textiles from Rajasthan' or 'Show pottery under ₹3000'"
          className="w-full h-14 pl-12 pr-32 bg-background border-2 border-border rounded-2xl text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors duration-200 shadow-warm-sm"
          data-testid="ai-search-input"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          <button
            onClick={handleVoiceSearch}
            disabled={isListening}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
              isListening 
                ? 'bg-accent text-accent-foreground animate-pulse' 
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={isListening ? "MicOff" : "Mic"} size={16} />
          </button>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => handleSearch()}
            disabled={!query?.trim()}
            className="h-10"
            data-testid="ai-search-button"
          >
            Search
          </Button>
        </div>
      </div>
      {/* AI Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-warm-lg z-50 overflow-hidden"
          >
            <div className="p-3">
              <div className="flex items-center space-x-2 mb-3">
                <Icon name="Sparkles" size={16} className="text-accent" />
                <span className="text-sm font-medium text-foreground">AI Suggestions</span>
              </div>
              
              <div className="space-y-1">
                {suggestions?.map((suggestion) => (
                  <button
                    key={suggestion?.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors duration-200 text-left group"
                  >
                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-200">
                      <Icon name={suggestion?.icon} size={16} className="text-accent" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {suggestion?.text}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {suggestion?.category}
                        </span>
                        {suggestion?.region && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {suggestion?.region}
                            </span>
                          </>
                        )}
                        {suggestion?.verified && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <div className="flex items-center space-x-1">
                              <Icon name="Shield" size={10} className="text-success" />
                              <span className="text-xs text-success">Verified</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Icon name="ArrowUpRight" size={14} className="text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Voice Search Indicator */}
      {isListening && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-accent/10 border border-accent/20 rounded-xl">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
            <span className="text-sm font-medium text-accent">Listening... Speak now</span>
            <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
          </div>
        </div>
      )}
      
      {/* AI Search Loading */}
      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 p-6 bg-background border border-border rounded-xl shadow-warm-lg" data-testid="ai-search-loading">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            <span className="text-sm font-medium text-foreground">AI is analyzing your request...</span>
          </div>
        </div>
      )}

      {/* AI Search Results */}
      {searchResults && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 p-6 bg-background border border-border rounded-xl shadow-warm-lg" data-testid="ai-search-results">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Icon name="Sparkles" size={20} className="text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-2">AI Suggestion</h4>
                <p className="text-sm text-muted-foreground" data-testid="ai-suggestion-text">
                  {searchResults.suggestion}
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h5 className="text-sm font-medium text-foreground mb-2">Recommended Products:</h5>
              <div className="space-y-2">
                {searchResults.products.map((product, index) => (
                  <div key={index} className="text-sm text-muted-foreground">• {product}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISearchBar;