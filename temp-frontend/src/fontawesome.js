// Import FontAwesome core
import { library } from '@fortawesome/fontawesome-svg-core';

// Import necessary icons
import {
  faQuestionCircle,
  faRoad,
  faUsers,
  faChartBar,
  faGraduationCap,
  faTrophy,
  faTasks,
  faUserFriends,
  faArrowRight,
  faChevronRight,
  faVideo,
  faFileAlt,
  faChalkboardTeacher,
  faBook,
  faHome,
  faSignOutAlt,
  faBell
} from '@fortawesome/free-solid-svg-icons';

// Add all icons to the library
// This avoids having to import icons in every component
library.add(
  faQuestionCircle,
  faRoad,
  faUsers,
  faChartBar,
  faGraduationCap,
  faTrophy,
  faTasks,
  faUserFriends,
  faArrowRight,
  faChevronRight,
  faVideo,
  faFileAlt,
  faChalkboardTeacher,
  faBook,
  faHome,
  faSignOutAlt,
  faBell
);

export default library; 