import React from 'react'
import { Link } from 'react-router-dom'
import Marquee from "react-fast-marquee";
import { RiCircleFill, RiDownloadLine, RiDiscordLine, RiInstagramLine, RiBehanceLine, RiLinkedinLine } from '@remixicon/react'
import profile from "../../assets/images/about/profile.png"
import partner1 from "../../assets/images/client-logos/partner1.webp"
import partner2 from "../../assets/images/client-logos/partner2.webp"
import partner3 from "../../assets/images/client-logos/partner3.webp"
import partner4 from "../../assets/images/client-logos/partner4.webp"
import partner5 from "../../assets/images/client-logos/partner5.webp"
import partner6 from "../../assets/images/client-logos/partner6.webp"
import partner7 from "../../assets/images/client-logos/partner7.webp"
import partner8 from "../../assets/images/client-logos/partner8.webp"
import partner9 from "../../assets/images/client-logos/partner9.webp"
import partner10 from "../../assets/images/client-logos/partner10.webp"
import partner11 from "../../assets/images/client-logos/partner11.webp"
import partner12 from "../../assets/images/client-logos/partner12.webp"
import SlideUp from '../../utlits/animations/slideUp';

const Hero = () => {
    return (
        <section id="about" className="about-area">
            <div className="container">
                <div className="row">
                    {/* <!-- START ABOUT IMAGE DESIGN AREA --> */}
                    <div className="col-lg-4">
                        <SlideUp>
                            <div className="about-image-part">
                                <img src={profile} alt="About Me" />
                                <h2>Abhijith Nair</h2>
                                <p>I am a Designer based in Mumbai.</p>
                                <div className="about-social text-center">
                                    <ul>
                                        <li><Link to="http://discordapp.com/users/428577279170445353"><RiDiscordLine size={20} /></Link></li>
                                        <li><Link to="https://www.instagram.com/abhijith._.n"><RiInstagramLine size={20} /></Link></li>
                                        <li><Link to="https://www.behance.net/abhijithnair"><RiBehanceLine size={20} /></Link></li>
                                        <li><Link to="https://www.linkedin.com/in/abhijith-nair-65654a122"><RiLinkedinLine size={20} /></Link></li>
                                    </ul>
                                </div>
                            </div>
                        </SlideUp>
                    </div>
                    {/* <!-- / END ABOUT IMAGE DESIGN AREA -->
                    <!-- START ABOUT TEXT DESIGN AREA --> */}
                    <div className="col-lg-8">
                        <SlideUp>
                            <div className="about-content-part">
                                <p>Hello There!</p>
                                <h2>
                                    I'm Abhijith Nair a designer skilled in graphic design, motion graphics, branding, and 3D animation. I bring bold ideas to life because nobody likes boring.
                                </h2>
                                <div className="adress-field">
                                    <ul>
                                        <li className='d-flex align-items-center'><i><RiCircleFill size={14} /></i> Available for Freelancing</li>
                                    </ul>
                                </div>
                                <div className="hero-btns">
                                    <a href="/Abhijith Nair CV.pdf" className="theme-btn" download>
                                        Download CV <i><RiDownloadLine size={16} /></i>
                                    </a>
                                </div>
                            </div>
                        </SlideUp>
                        <SlideUp>
                            <div className="about-content-part-bottom">
                                <h2>Trusted By</h2>
                                <div className="company-list">
                                    <div className="scroller">
                                        <div className="scroller__inner">
                                            <Marquee>
                                                <img src={partner1} alt="" />
                                                <img src={partner2} alt="" />
                                                <img src={partner3} alt="" />
                                                <img src={partner4} alt="" />
                                                <img src={partner5} alt="" />
                                                <img src={partner6} alt="" />
                                                <img src={partner7} alt="" />
                                                <img src={partner8} alt="" />
                                                <img src={partner9} alt="" />
                                                <img src={partner10} alt="" />
                                                <img src={partner11} alt="" />
                                                <img src={partner12} alt="" />
                                            </Marquee>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SlideUp>
                    </div>
                    {/* <!-- / END ABOUT TEXT DESIGN AREA --> */}
                </div>
            </div>
        </section>
    )
}

export default Hero