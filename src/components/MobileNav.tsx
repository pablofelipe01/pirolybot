import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, FileBox, MessageCircle, Image, Headphones, FileText } from 'lucide-react';

const MobileNav = ({ activeTab, onSelect }: { 
  activeTab: string; 
  onSelect: (value: string) => void 
}) => {
  const items = [
    { value: 'all', label: 'All', icon: <FileBox className="w-4 h-4" /> },
    { value: 'text', label: 'Text', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'image', label: 'Images', icon: <Image className="w-4 h-4" /> },
    { value: 'audio', label: 'Audio', icon: <Headphones className="w-4 h-4" /> },
    { value: 'document', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Content Type</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          {items.map((item) => (
            <Button
              key={item.value}
              variant={activeTab === item.value ? "default" : "ghost"}
              className="w-full justify-start gap-2 mb-2"
              onClick={() => {
                onSelect(item.value);
              }}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;