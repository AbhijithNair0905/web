import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
    const year = new Date().getFullYear()
    return (
        <footer className="main-footer">
            <div className="footer-bottom pt-50 pb-40">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-6">
                            <div className="copyright-text">
                                <p>
                                    Copyright @{year}, <Link to="/">Abhijith Nair</Link> All
                                    Rights Reserved.
                                </p>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="copyright-text extra-copyright">
                                <p>
                                    Built with ❤️ by {' '}
                                    <a href="https://yuvser.vercel.app" target="_blank" rel="noopener noreferrer">
                                        Yuvraj Darekar
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer