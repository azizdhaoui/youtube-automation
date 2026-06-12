import React from "react";
import { User, Check, X, Sparkles, Sliders, ToggleLeft, ToggleRight, HelpCircle } from "lucide-react";

export interface CharacterConsistency {
  enabled: boolean;
  name: string;
  genderAppearance: string;
  attire: string;
  physicalTraits: string;
  artStyle: string;
}

interface CharacterConsistencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CharacterConsistency;
  onUpdate: (settings: CharacterConsistency) => void;
}

export default function CharacterConsistencyModal({
  isOpen,
  onClose,
  settings,
  onUpdate,
}: CharacterConsistencyModalProps) {
  if (!isOpen) return null;

  const handleChange = (key: keyof CharacterConsistency, val: any) => {
    onUpdate({
      ...settings,
      [key]: val,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-text">
      <div 
        className="w-full max-w-[600px] bg-[#0c0c0c] border border-white/10 rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="bg-[#050505] border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="h-5 w-5 text-white/60" />
            <div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block font-bold">Image Design Locks</span>
              <h3 className="text-sm font-serif text-white tracking-widest uppercase font-semibold">Protagonist Character Consistency Suite</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all text-white/40 hover:text-white"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content input scrollboard */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Active status card */}
          <div className={`border p-4 flex items-center justify-between transition-all ${
            settings.enabled 
              ? "bg-[#ffffff]/5 border-white text-white" 
              : "bg-black/45 border-white/10 text-white/50"
          }`}>
            <div className="flex flex-col gap-1 pr-4">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Consistency Injection Status</span>
              <p className="text-xs text-[#E0D8D0]/60 leading-relaxed font-sans">
                {settings.enabled 
                  ? "Protagonist attributes are system-locked and will inject into any imagery prompt you copy."
                  : "Inactive. Standard scene-specific style prompts will be used instead."}
              </p>
            </div>
            
            <button
              onClick={() => handleChange("enabled", !settings.enabled)}
              className="px-4 py-2 text-xs font-mono uppercase tracking-widest transition-all bg-white hover:bg-[#e0d8d0] text-black font-bold flex items-center gap-1.5"
            >
              {settings.enabled ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>ON (LOCKED)</span>
                </>
              ) : (
                <span>ENABLE</span>
              )}
            </button>
          </div>

          <p className="text-xs text-[#E0D8D0]/50 font-sans leading-relaxed">
            Fill out recurring protagonist visual parameters below. When enabled, the storyboard prompts will automatically blend these details with your scenes of choice.
          </p>

          <div className="flex flex-col gap-4">
            
            {/* Protagonist Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">Protagonist Label Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full bg-[#050505] border border-white/10 focus:outline-none focus:border-white/30 p-2.5 text-xs text-white"
                placeholder="e.g., The Silent Voyager, An Overthinker, The Observer"
              />
            </div>

            {/* Base Gender/Age Appearance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">Archetype / Role Identity</label>
              <input
                type="text"
                value={settings.genderAppearance}
                onChange={(e) => handleChange("genderAppearance", e.target.value)}
                className="w-full bg-[#050505] border border-white/10 focus:outline-none focus:border-white/30 p-2.5 text-xs text-white"
                placeholder="e.g., A solitary young man, a thoughtful female wanderer"
              />
            </div>

            {/* Detailed physical features */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">Physical Features (Protagonist Anchor)</label>
              <input
                type="text"
                value={settings.physicalTraits}
                onChange={(e) => handleChange("physicalTraits", e.target.value)}
                className="w-full bg-[#050505] border border-white/10 focus:outline-none focus:border-white/30 p-2.5 text-xs text-white"
                placeholder="e.g., messy dark-brown charcoal hair, slender frame, tired nostalgic gaze"
              />
            </div>

            {/* Recurrent Wardrobe Attire */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">Aesthetic Wardrobe / Attire</label>
              <input
                type="text"
                value={settings.attire}
                onChange={(e) => handleChange("attire", e.target.value)}
                className="w-full bg-[#050505] border border-white/10 focus:outline-none focus:border-white/30 p-2.5 text-xs text-white"
                placeholder="e.g., dressed in a heavy long dark-grey wool coat and a simple black scarf"
              />
            </div>

            {/* Art / Production Style medium specification */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">Locked Production / Cinematography Style</label>
              <input
                type="text"
                value={settings.artStyle}
                onChange={(e) => handleChange("artStyle", e.target.value)}
                className="w-full bg-[#050505] border border-white/10 focus:outline-none focus:border-white/30 p-2.5 text-xs text-white"
                placeholder="e.g., shot on moody 35mm cinematic film grain, dark chiaroscuro, desaturated slate tones"
              />
            </div>

          </div>

          {/* Prompt Preview Injection demonstration */}
          <div className="bg-[#050505] border border-white/5 p-4 flex flex-col gap-1.5">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Blended Style Prompt Preview Injection:
            </span>
            <div className="text-[10px] font-mono text-[#E0D8D0]/60 p-3 bg-black border border-white/5 select-all leading-relaxed whitespace-pre-wrap">
              {`A detailed high metaphor scene of `}
              <span className="text-white underline font-semibold">{settings.name || "Protagonist"}</span>
              {` (${settings.genderAppearance || "archetype"}, ${settings.physicalTraits || "traits"}, ${settings.attire || "clothing"}), `}
              <span className="text-white/40 italic">standing in a dense grey fog facing a monumental glass monolith</span>
              {`, rendering details in `}
              <span className="text-white underline font-semibold">{settings.artStyle || "medium"}</span>
              {`.`}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="bg-[#050505] border-t border-white/10 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-white/10 hover:border-white/20 font-mono text-xs uppercase text-white/80 hover:text-white tracking-widest font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-black hover:bg-[#e0d8d0] font-mono text-xs uppercase tracking-widest font-bold transition-all"
          >
            Save Trait Locks
          </button>
        </div>

      </div>
    </div>
  );
}
