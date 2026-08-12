export type SiteSectionId =
  | "hero"
  | "career"
  | "projects"
  | "practice"
  | "lounge";

export type CapabilityLevel = 1 | 2 | 3 | 4;

export type CapabilityRadar = [
  CapabilityLevel,
  CapabilityLevel,
  CapabilityLevel,
  CapabilityLevel,
  CapabilityLevel,
  CapabilityLevel,
];

export interface SectionConfig {
  id: SiteSectionId;
  label: string;
  shortLabel: string;
  order: number;
  enabled: boolean;
}

export interface BrandContent {
  name: string;
  wordmark: string;
  ownerName: string;
  location: string;
  onlineLabel: string;
}

export interface HeroContent {
  eyebrow: string;
  title: string;
  statement: string;
  welcome: string;
  tags: string[];
  primaryCta: string;
  secondaryCta: string;
}

export interface IdentityCardContent {
  front: {
    eyebrow: string;
    name: string;
    role: string;
    summary: string;
    tags: string[];
    primaryCta: string;
    secondaryCta: string;
    flipToBack: string;
  };
  back: {
    eyebrow: string;
    title: string;
    statusLabel: string;
    footerEyebrow: string;
    footerBody: string;
    flipToFront: string;
  };
  closeLabel: string;
}

export interface CareerStage {
  id: string;
  publicBrand: string;
  period: string;
  role: string;
  positioning: string;
  highlights: string[];
  radar: CapabilityRadar;
  nextStageId?: string;
}

export type ProjectPathLabel =
  | "业务问题"
  | "核心判断"
  | "解决路径"
  | "抽象成果";

export interface ProjectPathStep {
  label: ProjectPathLabel;
  content: string;
}

export interface ProjectCase {
  title: string;
  summary: string;
}

export interface ProjectTheme {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  capabilityLevels?: CapabilityRadar;
  solutionPath: [
    ProjectPathStep,
    ProjectPathStep,
    ProjectPathStep,
    ProjectPathStep,
  ];
  tags: string[];
  cases: ProjectCase[];
  published: boolean;
  featured: boolean;
  order: number;
}

export type PracticeStatus = "online" | "building" | "planned";

export interface PracticeLink {
  id: string;
  title: string;
  description: string;
  type: string;
  status: PracticeStatus;
  statusLabel: string;
  icon: "route" | "sparkles" | "coffee" | "github";
  href?: string;
  featured: boolean;
  visible: boolean;
  order: number;
}

export type KnowledgeAccess = "public" | "available" | "request";

export interface KnowledgeBadge {
  id: string;
  name: string;
  description: string;
  access: KnowledgeAccess;
  accessLabel: string;
  ragEnabled: boolean;
}

export interface LoungeContent {
  eyebrow: string;
  title: string;
  intro: string;
  inputPlaceholder: string;
  sendLabel: string;
  quickQuestions: string[];
  knowledge: KnowledgeBadge[];
  boundaries: string[];
}

export interface FooterContent {
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
}

export interface SectionIntroCopy {
  eyebrow: string;
  title: string;
  body: string;
}

export interface SitePresentation {
  headerCta: string;
  heroProof: [
    { value: string; label: string },
    { value: string; label: string },
    { value: string; label: string },
  ];
  heroPracticeEyebrow: string;
  heroPracticeLabel: string;
  heroScrollHint: string;
  career: SectionIntroCopy & {
    nextStagePrefix: string;
    projectsCta: string;
    radarCaption: string;
  };
  projects: SectionIntroCopy & {
    activeCardCta: string;
    inactiveCardCta: string;
    detailCta: string;
    mapEyebrow: string;
    mapCaption: string;
    mapCore: string;
  };
  practice: SectionIntroCopy & {
    openCta: string;
    pendingCta: string;
  };
  lounge: {
    displayTitle: string;
    onlineLabel: string;
    visitorLabel: string;
    statusHint: string;
    chatTitle: string;
    boundary: string;
  };
  footer: {
    eyebrow: string;
    bottomNote: string;
  };
}

export interface SiteContent {
  schemaVersion: number;
  brand: BrandContent;
  hero: HeroContent;
  /** Optional for backward compatibility with content saved before identity-card editing existed. */
  identityCard?: IdentityCardContent;
  sections: SectionConfig[];
  capabilityAxes: [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  career: CareerStage[];
  projects: ProjectTheme[];
  practice: PracticeLink[];
  lounge: LoungeContent;
  footer: FooterContent;
  /** Optional for backward compatibility with content saved before v2. */
  presentation?: SitePresentation;
}
