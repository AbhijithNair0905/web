import { RiFilmFill, RiFilmLine, RiGamepadFill, RiGamepadLine, RiGlobalFill, RiGlobalLine, RiMegaphoneLine, RiPaletteFill, RiPaletteLine, RiPantoneFill, RiQuillPenLine, RiSpeakLine } from '@remixicon/react'
import React from 'react'
import SlideUp from '../../utlits/animations/slideUp'

const ServiceGrid = () => {
    return (
        <section id="services" className="services-area innerpage-single-area">
            <div className="container">
                <div className="container-inner">
                    <div className="row">
                        <div className="col-xl-12 col-lg-12">
                            <SlideUp>
                                <div className="section-title text-center">
                                    <p>Services</p>
                                    <h2>Quality Services</h2>
                                </div>
                            </SlideUp>
                        </div>
                    </div>
                    <div className="row">
                        <Card id={1} icon={<RiPaletteLine size={60} />} title={"Design Services"} description={"From impactful logos to complete brand guidelines, I offer tailored visual solutions for both print and digital platforms. Services include social media creatives, UI/UX design, merchandise, and professional presentations."} />
                        <Card id={2} icon={<RiFilmLine size={60} />} title={"Video & Motion Graphics"} description={"Engaging motion graphics and video content for businesses and creators. I specialize in explainer videos, animated reels, video editing, intros/outros, and kinetic typography."} />
                        <Card id={3} icon={<RiGamepadLine size={60} />} title={"3D & Animation"} description={"Bring ideas to life with 3D design—covering product visuals, logo and character animation, texturing, and scene composition. Perfect for product showcases and storytelling."} />
                        <Card id={3} icon={<RiGlobalLine size={60} />} title={"AR & Emerging Tech"} description={"Create immersive digital experiences with Meta Spark AR filters and basic interactive content designed for social platforms and campaigns."} />
                        <Card id={3} icon={<RiMegaphoneLine size={60} />} title={"Marketing & Strategy"} description={"Boost your brand with creative ad assets, campaign visuals, content strategies, and visual support for online communities like Discord or Telegram."} />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ServiceGrid

const Card = ({ icon, title, description, id }) => {
    return (
        <div className="col-lg-4 col-md-6 d-flex mb-4   ">
            <SlideUp delay={id}>
                <div className="service-item w-100 d-flex flex-column h-100">
                    {icon}
                    <h4>{title}</h4>
                    <p>{description}</p>
                </div>
            </SlideUp>
        </div>
    )
}