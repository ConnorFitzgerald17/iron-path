import { BarChart3 } from "lucide-react";
import { skillIcon } from "@/lib/icons";
import { skillShowcaseKey, visibleShowcaseSkills } from "@/lib/skill-showcase";
import type { SkillShowcaseSelection, SkillSnapshot } from "@/lib/types";
import { ItemImage } from "./item-image";

export function SkillShowcase({ skills, selection }: { skills: SkillSnapshot[]; selection: SkillShowcaseSelection }) {
  const visibleSkills = visibleShowcaseSkills(skills, selection);
  if (!visibleSkills.length) return null;
  return <section className="skill-showcase">
    <header><span><BarChart3 size={15} /> STATS</span><small>{selection.all ? "All stats" : `${visibleSkills.length} selected`}</small></header>
    <div>{visibleSkills.map((skill) => <article key={skillShowcaseKey(skill.skill)}>
      <ItemImage src={skillIcon(skill.skill)} alt={skill.skill} size={30} />
      <span><small>{skill.skill}</small><strong>{skill.level}</strong></span>
    </article>)}</div>
  </section>;
}
