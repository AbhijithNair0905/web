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
import Project1 from "../pages/projects/project1";
import Project2 from "../pages/projects/project2";
import Project3 from "../pages/projects/project3";
import Project4 from "../pages/projects/project4";


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
                path: "/project/1",
                element: <Project1 />
            },
            {
                path: "/project/2",
                element: <Project2 />
            },
            {
                path: "/project/3",
                element: <Project3 />
            },
            {
                path: "/project/4",
                element: <Project4 />
            },
            {
                path: "/works",
                element: <Works />
            },
        ]
    }
])