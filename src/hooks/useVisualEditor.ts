import { useState, useCallback } from 'react';
import { PageContent } from '../types';

export const useVisualEditor = (initialContent: PageContent[] = []) => {
  const [content, setContent] = useState<PageContent[]>(initialContent);
  const [selectedComponent, setSelectedComponent] = useState<PageContent | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleAddComponent = useCallback((component: PageContent) => {
    setContent((prev) => [...prev, component]);
  }, []);

  const handleUpdateComponent = useCallback((updatedComponent: PageContent) => {
    setContent((prev) =>
      prev.map((c) => (c.id === updatedComponent.id ? updatedComponent : c))
    );
  }, []);

  const handleDeleteComponent = useCallback((componentId: string) => {
    setContent((prev) => prev.filter((c) => c.id !== componentId));
  }, []);

  const handleMoveComponent = useCallback((dragIndex: number, hoverIndex: number) => {
    setContent((prev) => {
      const newContent = [...prev];
      const [draggedItem] = newContent.splice(dragIndex, 1);
      newContent.splice(hoverIndex, 0, draggedItem);
      return newContent;
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      // Here you would typically make an API call to save the content
      // Example:
      // await savePageContent(content);
      return true;
    } catch (error) {
      console.error('Failed to save content:', error);
      return false;
    }
  }, [content]);

  return {
    content,
    selectedComponent,
    isDragging,
    setSelectedComponent,
    setIsDragging,
    handleAddComponent,
    handleUpdateComponent,
    handleDeleteComponent,
    handleMoveComponent,
    handleSave,
  };
};
