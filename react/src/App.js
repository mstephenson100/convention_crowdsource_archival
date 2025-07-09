import './theme.css';
//import { Navigate } from "react-router-dom";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./components/Home";
import EditList from "./components/EditList";
import EditDetail from "./components/EditDetail";
import GuestProfile from './components/GuestProfile';
import AccoladesByYear from './components/AccoladesByYear';
import AccoladesHome from './components/AccoladesHome';
import AccoladesByCategory from './components/AccoladesByCategory';
import AccoladeCategoryDetail from './components/AccoladeCategoryDetail.js';
import CrowdsourceGate from './components/CrowdsourceGate';
import CollectiblesHome from "./components/CollectiblesHome";
import CollectiblesByYear from "./components/CollectiblesByYear";
import UnsortedCollectibles from "./components/UnsortedCollectibles";
import GuestBrowse from "./components/GuestBrowse";
import GuestPublicList from "./components/GuestPublicList";
import VendorBrowse from "./components/VendorBrowse";
import VendorPublicList from "./components/VendorPublicList";
import ModerationPage from "./components/ModerationPage";
import GuestsModeration from "./components/GuestsModeration";
import CollectiblesModeration from "./components/CollectiblesModeration";
import AddGuest from "./components/AddGuest";
import AdminUserManagement from "./components/AdminUserManagement";
import UserMetrics from "./components/UserMetrics";
import GuestSearchPredictive from './components/GuestSearchPredictive';
import VendorSearchPredictive from './components/VendorSearchPredictive';
import EditCollectibleList from './components/EditCollectibleList';
import EditCollectibleDetail from './components/EditCollectibleDetail';
import AddCollectible from './components/AddCollectible';
import UserProfile from './components/UserProfile';
import GuestSubmissions from './components/GuestSubmissions';
import CollectibleSubmissions from './components/CollectibleSubmissions';


//const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || '';

function App() {
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/edit/:year" element={<EditList />} />
          <Route path="/edit/guest/:year/:guest_id" element={<EditDetail />} />
          <Route path="/accolades" element={<AccoladesHome />} />
          <Route path="/accolades/year" element={<AccoladesByYear />} />
          <Route path="/accolades/year/:year" element={<AccoladesByYear />} />
          <Route path="/accolades/category" element={<AccoladesByCategory />} />
          <Route path="/accolades/category/:category" element={<AccoladeCategoryDetail />} />
          <Route path="/collectibles" element={<CollectiblesHome />} />
          <Route path="/collectibles/by-year" element={<CollectiblesByYear />} />
          <Route path="/collectibles/unsorted" element={<UnsortedCollectibles />} />
          <Route path="/crowdsource" element={<CrowdsourceGate />} />
          <Route path="/crowdsource/add" element={<AddGuest />} />
          <Route path="/guests" element={<GuestBrowse />} />
          <Route path="/guests/:year" element={<GuestPublicList />} />
          <Route path="/guest_profile/:guest_id" element={<GuestProfile />} />
          <Route path="/vendors" element={<VendorBrowse />} />
          <Route path="/vendors/:year" element={<VendorPublicList />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/moderation/guests" element={<GuestsModeration />} />
          <Route path="/moderation/collectibles" element={<CollectiblesModeration />} />
          <Route path="/admin/users" element={<AdminUserManagement />} />
          <Route path="/user_metrics/:user_id" element={<UserMetrics />} />
          <Route path="/guest_search" element={<GuestSearchPredictive />} />
          <Route path="/vendor_search" element={<VendorSearchPredictive />} />
          <Route path="/edit/collectible/:collectible_id" element={<EditCollectibleDetail />} />
          <Route path="/edit/collectibles" element={<EditCollectibleList />} />
          <Route path="/add_collectible" element={<AddCollectible />} />
          <Route path="/user/:userId" element={<UserProfile />}>
            <Route path="guest_submissions" element={<GuestSubmissions />} />
            <Route path="collectible_submissions" element={<CollectibleSubmissions />} />
          </Route>

        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
