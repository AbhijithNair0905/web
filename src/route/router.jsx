import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
import Contact from "../pages/contact";
import About from "../pages/about";
import Service from "../pages/service";
import SingleProject from "../pages/single-project";
import SingleProjectA from "../pages/single-project copy 3";
import Works from "../pages/works";
import SingleProjectTemplate from "../pages/single-project-template";


export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {
                path: "/",
                element: <Home />
            },
            {
                path: "/contact",
                element: <Contact />
            },
            {
                path: "/about",
                element: <About />
            },
            {
                path: "/service",
                element: <Service />
            },
            {
                path: "/single-project",
                element: <SingleProject />
            },
            {
                path: "/project/:id",
                element: <SingleProjectTemplate />
            },
            {
                path: "/works",
                element: <Works />
            },
        ]
    }
])