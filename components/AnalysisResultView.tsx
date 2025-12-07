import React from 'react';
import { AnalysisResult } from '../types';
import { 
  BrainCircuit, 
  Map, 
  RefreshCcw, 
  Zap, 
  Target, 
  Compass, 
  MessageSquare
} from 'lucide-react';

interface AnalysisResultViewProps {
  data: AnalysisResult;
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  delay?: number;
}

const Section: React.FC<SectionProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  delay = 0 
}) => (
  <div className="mb-8 p-6 bg-white rounded-xl border border-stone-100 shadow-sm animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-stone-600" />
      <h3 className="text-lg font-serif font-bold text-stone-800">{title}</h3>
    </div>
    {children}
  </div>
);

const ListContent: React.FC<{ items: string[] }> = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-stone-400 italic text-sm">Not enough data for this section.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-stone-700 leading-relaxed">
          <span className="mt-2 w-1.5 h-1.5 bg-stone-400 rounded-full flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      
      {/* Overview Card */}
      <div className="bg-stone-800 text-stone-50 p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-serif font-bold mb-3">Overview</h2>
        <p className="leading-relaxed text-stone-200">{data.overview}</p>
      </div>

      <Section title="Emotional & Thought Patterns" icon={BrainCircuit} delay={100}>
        <ListContent items={data.emotional_patterns} />
      </Section>

      <Section title="Environment & Space Patterns" icon={Map} delay={200}>
        <ListContent items={data.environment_patterns} />
      </Section>

      <Section title="Behavioral Loops" icon={RefreshCcw} delay={300}>
        <ListContent items={data.behavioral_loops} />
      </Section>

      <Section title="Triggers" icon={Zap} delay={400}>
        <ListContent items={data.triggers} />
      </Section>

      <Section title="Recurring Themes" icon={Target} delay={500}>
        <ListContent items={data.recurring_themes} />
      </Section>

      <Section title="What You Seem to Be Chasing" icon={Compass} delay={600}>
        <p className="text-stone-700 leading-relaxed italic border-l-4 border-stone-300 pl-4 py-1">
          {data.core_pursuits_and_why || "Not enough data to infer core motivations."}
        </p>
      </Section>

      <div className="mt-8 bg-amber-50 p-6 rounded-xl border border-amber-100">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-amber-700" />
          <h3 className="text-lg font-serif font-bold text-amber-900">Reflection Prompts</h3>
        </div>
        <div className="grid gap-4">
          {data.reflection_prompts?.map((prompt, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-amber-100/50 text-stone-800 font-medium">
              {prompt}
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center mt-12 mb-4 text-xs text-stone-400">
        <p>Pattern Mirror AI • Self-reflection tool only • Not medical advice</p>
      </div>
    </div>
  );
};

export default AnalysisResultView;