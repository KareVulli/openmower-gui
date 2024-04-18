// eslint-disable-next-line import/order
import { App } from "antd";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider, } from "react-router-dom";
import { Spinner } from "./components/Spinner.tsx";
import LogsPage from "./pages/LogsPage.tsx";
import MapPage from "./pages/MapPage.tsx";
import OpenMowerPage from "./pages/OpenMowerPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import SetupPage from "./pages/SetupPage.tsx";
import SimpleMapPage from './pages/SimpleMapPage.tsx';
import Root from "./routes/root.tsx";
import './wdyr';

const router = createHashRouter([
    {
        path: "/",
        element: <Root/>,
        children: [
            {
                element: <SettingsPage/>,
                path: "/settings",
            },
            {
                element: <LogsPage/>,
                path: "/logs",
            },
            {
                element: <OpenMowerPage/>,
                path: "/openmower",
            },
            {
                element: <MapPage/>,
                path: "/map",
            },
            {
                element: <SetupPage/>,
                path: "/setup",
            }
        ]
    },
    {
        element: <SimpleMapPage/>,
        path: "/simple-map",
    },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <App style={{height: "100%"}}>
          <React.Suspense fallback={<Spinner/>}>
              <RouterProvider router={router}/>
          </React.Suspense>
      </App>
  </React.StrictMode>,
)
