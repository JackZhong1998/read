import type { DiscoverFeedSegment } from "@/lib/discover-feed-types";

import female1218 from "./female-12-18.json";
import female1822 from "./female-18-22.json";
import female2230 from "./female-22-30.json";
import female3040 from "./female-30-40.json";
import female4050 from "./female-40-50.json";
import female50plus from "./female-50+.json";
import femaleUnder12 from "./female-under-12.json";
import male1218 from "./male-12-18.json";
import male1822 from "./male-18-22.json";
import male2230 from "./male-22-30.json";
import male3040 from "./male-30-40.json";
import male4050 from "./male-40-50.json";
import male50plus from "./male-50+.json";
import maleUnder12 from "./male-under-12.json";

export const DISCOVER_FEEDS: DiscoverFeedSegment[] = [
  maleUnder12 as DiscoverFeedSegment,
  male1218 as DiscoverFeedSegment,
  male1822 as DiscoverFeedSegment,
  male2230 as DiscoverFeedSegment,
  male3040 as DiscoverFeedSegment,
  male4050 as DiscoverFeedSegment,
  male50plus as DiscoverFeedSegment,
  femaleUnder12 as DiscoverFeedSegment,
  female1218 as DiscoverFeedSegment,
  female1822 as DiscoverFeedSegment,
  female2230 as DiscoverFeedSegment,
  female3040 as DiscoverFeedSegment,
  female4050 as DiscoverFeedSegment,
  female50plus as DiscoverFeedSegment,
];
