interface NavigatorUAData {
  platform: string;
}

interface Navigator {
  userAgentData?: NavigatorUAData;
}

interface PagefindUIOptions {
  element: string;
  showSubResults?: boolean;
  showImages?: boolean;
  autofocus?: boolean;
  resetStyles?: boolean;
  translations?: Record<string, string>;
}

declare class PagefindUI {
  constructor(options: PagefindUIOptions);
}

interface Window {
  PagefindUI: typeof PagefindUI;
}
