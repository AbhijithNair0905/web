import React from 'react'
import singleProjectImg from "../assets/images/projects/single-project.jpg"
import singleProject1 from "../assets/images/projects/single-project1.jpg"
import singleProject2 from "../assets/images/projects/single-project2.jpg"
import singleProject3 from "../assets/images/projects/single-project3.jpg"
import singleProject4 from "../assets/images/projects/single-project4.jpg"

const SingleProject = () => {
    return (
        <div class="single-project-page-design">
            <div class="container">
                <div class="row">
                    <div class="col-lg-12 text-center pb-30">
                        <p>ZIPPEX DELIVERY APP</p>
                        <h1>ZIPPEX: Redefining Local Delivery</h1>
                    </div>
                </div>
            </div>
            <div class="single-project-image">
                <img src={singleProjectImg} alt="image" />
            </div>
            <div class="container pt-30">
                <div class="row">
                    <div class="col-lg-4">
                        {/* <!-- START SINGLE LEFT DESIGN AREA --> */}
                        <div class="single-project-page-left wow fadeInUp delay-0-2s">
                            <div class="single-info">
                                <p>Year</p>
                                <h3>2023</h3>
                            </div>
                            <div class="single-info">
                                <p>Client</p>
                                <h3>Saransh Ahuja (Zippex Founder)</h3>
                            </div>
                            <div class="single-info">
                                <p>Services</p>
                                <h3>Branding, Social Media</h3>
                            </div>
                            <div class="single-info">
                                <p>Project</p>
                                <h3>Creative</h3>
                            </div>
                        </div>
                        {/* <!-- / END SINGLE LEFT DESIGN AREA --> */}
                    </div>
                    {/* <!-- START SINGLE RIGHT DESIGN AREA --> */}
                    <div class="col-lg-8">
                        <div class="single-project-page-right wow fadeInUp delay-0-4s">
                            <h2>
                                Description
                            </h2>
                            <p>In 2024, I had the pleasure of branding ZIPPEX, a pioneering app based in Abbotsford, Canada, committed to transforming local delivery and fostering community connections. More than just a delivery service, ZIPPEX is a vibrant platform that champions local businesses and promotes sustainability through a unique peer-to-peer model.</p>
                            <p>The logo features a distinctive "X" composed of four squares, symbolizing an open box—a nod to the app's mission of sharing goods and encouraging collaboration within neighborhoods. This design embodies the trust and camaraderie ZIPPEX cultivates, setting it apart from traditional delivery services. My work aimed to reflect this spirit of innovation and community, helping to build a more connected and thriving local landscape.</p>
                        </div>
                    </div>
                    {/* <!-- / END SINGLE RIGHT DESIGN AREA --> */}
                </div>
                {/* <!-- START SINGLE PAGE GALLERY DESIGN AREA --> */}
                <div class="row pt-30">
                    <div class="col-lg-6">
                        <div class="single-image wow fadeInUp delay-0-2s">
                            <img src={singleProject1} alt="gallery" />
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="single-image wow fadeInUp delay-0-4s">
                            <img src={singleProject2} alt="gallery" />
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="single-image wow fadeInUp delay-0-6s">
                            <img src={singleProject3} alt="gallery" />
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="single-image wow fadeInUp delay-0-8s">
                            <img src={singleProject4} alt="gallery" />
                        </div>
                    </div>
                </div>
                {/* <!--  / END SINGLE PAGE GALLERY DESIGN AREA --> */}
            </div>
        </div>
    )
}

export default SingleProject