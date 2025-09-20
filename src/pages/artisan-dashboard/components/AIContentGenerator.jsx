import React, { useState, useEffect } from 'react';
import AppIcon from '../../../components/AppIcon';
import AppImage from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import AgentStatusIndicator from '../../ai-shopping-assistant/components/AgentStatusIndicator';
import TaskProgress from '../../ai-shopping-assistant/components/TaskProgress';
import { useWebSocket } from '../../ai-shopping-assistant/components/WebSocketManager';

const contentTypes = [
  { id: 'social', label: 'Social Media Post', icon: 'share-2' },
  { id: 'product', label: 'Product Description', icon: 'file-text' },
  { id: 'story', label: 'Cultural Story', icon: 'book-open' },
  { id: 'seo', label: 'SEO Content', icon: 'search' },
  { id: 'email', label: 'Email Campaign', icon: 'mail' }
];

const sampleImages = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300',
    alt: 'Handwoven textile'
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=300',
    alt: 'Wooden craft'
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300',
    alt: 'Ceramic pottery'
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300',
    alt: 'Metal jewelry'
  }
];

const AIContentGenerator = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentType, setContentType] = useState('social');
  const [customPrompt, setCustomPrompt] = useState('');
  const [culturalContext, setCulturalContext] = useState({
    technique: '',
    region: '',
    heritage: ''
  });
  const [progress, setProgress] = useState(null);
  const { socket, isConnected } = useWebSocket();

  // Handle WebSocket events for content generation progress
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (data.taskType === 'content-generation') {
        setProgress(data.progress);
      }
    };

    const handleComplete = (data) => {
      if (data.taskType === 'content-generation') {
        setIsGenerating(false);
        setGeneratedContent(data.content);
        setProgress(null);
      }
    };

    socket.on('agent-task-progress', handleProgress);
    socket.on('agent-task-complete', handleComplete);

    return () => {
      socket.off('agent-task-progress', handleProgress);
      socket.off('agent-task-complete', handleComplete);
    };
  }, [socket]);

  const handleImageSelect = (image) => {
    setSelectedImage(image);
    setGeneratedContent('');
  };

  const handleImageUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage({
          id: 'uploaded',
          url: e?.target?.result,
          alt: file?.name
        });
        setGeneratedContent('');
      };
      reader?.readAsDataURL(file);
    }
  };

  const generateContent = async () => {
    if (!selectedImage || !isConnected) return;

    setIsGenerating(true);
    setGeneratedContent('');
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage.url);
      formData.append('contentType', contentType);
      formData.append('prompt', customPrompt);
      formData.append('culturalContext', JSON.stringify(culturalContext));

      // Start the appropriate agent task based on content type
      const agentEndpoint = contentType === 'product' || contentType === 'seo'
        ? '/api/agents/artisanAssistant/task'
        : '/api/agents/contentGeneration/task';

      const response = await fetch(agentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: contentType === 'product' || contentType === 'seo' 
            ? 'generateListingContent' 
            : 'generateContent',
          context: {
            image: selectedImage.url,
            contentType,
            prompt: customPrompt,
            culturalContext,
          }
        })
      });

      if (!response.ok) throw new Error('Failed to generate content');
      
    } catch (error) {
      console.error('Content generation error:', error);
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(generatedContent);
    // You could add a toast notification here
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-warm-sm">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-accent text-accent-foreground rounded-lg">
            <AppIcon name="sparkles" size={20} />
          </div>
          <h3 className="text-lg font-heading font-semibold text-foreground">
            AI Content Generator
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload or select an image to generate promotional content using AI
        </p>
      </div>

      <div className="p-6">
        {/* Content Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-3">
            Content Type
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors duration-200 ${
                  contentType === type.id
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border hover:border-primary/50 text-foreground'
                }`}
              >
                <AppIcon name={type.icon} size={16} />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Image Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-3">
            Select or Upload Image
          </label>
          
          {/* Upload Button */}
          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload">
              <Button variant="outline" className="cursor-pointer">
                <AppIcon name="upload" size={16} className="mr-2" />
                Upload Image
              </Button>
            </label>
          </div>

          {/* Sample Images */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sampleImages.map((image) => (
              <div
                key={image.id}
                onClick={() => handleImageSelect(image)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  selectedImage?.id === image.id
                    ? 'border-primary shadow-warm-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="aspect-square">
                  <AppImage
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedImage?.id === image.id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <AppIcon name="check" size={16} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cultural Context */}
        <div className="mb-6 space-y-4">
          <h4 className="text-sm font-medium text-foreground">Cultural Context</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Traditional Technique"
              type="text"
              placeholder="E.g., Block printing, Handloom weaving..."
              value={culturalContext.technique}
              onChange={e => setCulturalContext(prev => ({
                ...prev,
                technique: e.target.value
              }))}
            />
            <Input
              label="Region"
              type="text"
              placeholder="E.g., Rajasthan, Kerala..."
              value={culturalContext.region}
              onChange={e => setCulturalContext(prev => ({
                ...prev,
                region: e.target.value
              }))}
            />
            <Input
              label="Artisan Heritage"
              type="text"
              placeholder="E.g., Family craft tradition, community heritage..."
              value={culturalContext.heritage}
              onChange={e => setCulturalContext(prev => ({
                ...prev,
                heritage: e.target.value
              }))}
            />
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="mb-6">
          <Input
            label="Custom Prompt (Optional)"
            type="text"
            placeholder="Add specific details or style preferences..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            description="Provide additional context to customize the generated content"
          />
        </div>

        {/* Progress Indicator */}
        {progress && (
          <div className="mb-6">
            <TaskProgress 
              value={progress.value}
              label={progress.label || 'Generating content...'}
            />
          </div>
        )}

        {/* Generate Button */}
        <div className="mb-6 flex items-center justify-between">
          <AgentStatusIndicator 
            status={isGenerating ? 'running' : 'ready'} 
            showDetails={true}
          />
          <Button
            variant="default"
            onClick={generateContent}
            disabled={!selectedImage || isGenerating || !isConnected}
            className="w-full sm:w-auto"
          >
            <AppIcon name="sparkles" size={16} className="mr-2" />
            {isGenerating ? 'Generating Content...' : 'Generate Content'}
          </Button>
        </div>

        {/* Generated Content */}
        {generatedContent && (
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Generated Content</h4>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                  <AppIcon name="copy" size={16} className="mr-2" />
                  Copy
                </Button>
                <Button variant="ghost" size="sm">
                  <AppIcon name="edit-2" size={16} className="mr-2" />
                  Edit
                </Button>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                {generatedContent}
              </pre>
              
              {/* Version History */}
              {(contentType === 'product' || contentType === 'seo') && (
                <div className="mt-4 border-t border-border pt-4">
                  <h5 className="text-xs font-medium mb-2">Previous Versions</h5>
                  <div className="space-y-2">
                    {/* We would fetch and map through version history here */}
                    <div className="text-xs text-muted-foreground">
                      No previous versions available
                    </div>
                  </div>
                </div>
              )}

              {/* SEO Performance */}
              {contentType === 'seo' && (
                <div className="mt-4 border-t border-border pt-4">
                  <h5 className="text-xs font-medium mb-2">SEO Performance</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background rounded p-2">
                      <div className="text-xs text-muted-foreground">Readability</div>
                      <div className="text-sm font-medium">Good</div>
                    </div>
                    <div className="bg-background rounded p-2">
                      <div className="text-xs text-muted-foreground">Keywords</div>
                      <div className="text-sm font-medium">8 targeted</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIContentGenerator;