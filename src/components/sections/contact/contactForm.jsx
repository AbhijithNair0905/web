import React from 'react';
import { RiMailLine } from '@remixicon/react';
import SlideUp from '../../../utlits/animations/slideUp';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Circles } from 'react-loader-spinner';  // Import spinner

const ContactForm = () => {
    const [result, setResult] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const onSubmit = async (event) => {
        event.preventDefault();
        setResult("Sending...");
        setLoading(true);

        const formData = new FormData(event.target);
        formData.append("access_key", "a7f6912e-dc4d-4e73-825f-12767e4d056b");

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setResult("Form Submitted Successfully");
                event.target.reset();
                toast.success("Form submitted successfully!");
            } else {
                setResult(data.message);
                toast.error(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="col-lg-8">
            <SlideUp>
                <div className="contact-form contact-form-area">
                    <form id="contactForm" className="contactForm" name="contactForm" onSubmit={onSubmit}>
                        <input type="hidden" name="access_key" value="a7f6912e-dc4d-4e73-825f-12767e4d056b"></input>
                        <div className="row">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input type="text" id="name" name="name" className="form-control" placeholder="Steve Milner" required data-error="Please enter your Name" />
                                    <label htmlFor="name" className="for-icon"><i className="far fa-user"></i></label>
                                    <div className="help-block with-errors"></div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label htmlFor="email">Email Address</label>
                                    <input type="email" id="email" name="email" className="form-control" placeholder="hello@websitename.com" required data-error="Please enter your Email" />
                                    <label htmlFor="email" className="for-icon"><i className="far fa-envelope"></i></label>
                                    <div className="help-block with-errors"></div>
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="form-group">
                                    <label htmlFor="message">Your Message</label>
                                    <textarea name="message" id="message" className="form-control" rows="4" placeholder="Write Your message" required data-error="Please Write your Message"></textarea>
                                    <div className="help-block with-errors"></div>
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="form-group mb-0">
                                    <button type="submit" className="theme-btn" disabled={loading}>
                                        {loading ? (
                                            <Circles
                                                height="25"
                                                width="25"
                                                color="#fff"
                                                ariaLabel="loading"
                                            />
                                        ) : (
                                            <>Send Me Message <i><RiMailLine size={15} /></i></>
                                        )}
                                    </button>
                                    <div id="msgSubmit" className="hidden"></div>
                                </div>
                            </div>
                        </div>
                    </form>
                    <ToastContainer />
                </div>
            </SlideUp>
        </div>
    );
}

export default ContactForm;



// <div className="col-lg-8">
//             <SlideUp>
//                 <div className="contact-form contact-form-area">
//                     <form id="contactForm" className="contactForm" name="contactForm" action="https://api.web3forms.com/submit" method="post">
//                     <input type="hidden" name="access_key" value="a7f6912e-dc4d-4e73-825f-12767e4d056b"></input>
//                         <div className="row">
//                             <div className="col-md-6">
//                                 <div className="form-group">
//                                     <label for="name">Full Name</label>
//                                     <input type="text" id="name" name="name" className="form-control" placeholder="Steve Milner" required="" data-error="Please enter your Name" />
//                                     <label for="name" className="for-icon"><i className="far fa-user"></i></label>
//                                     <div className="help-block with-errors"></div>
//                                 </div>
//                             </div>
//                             <div className="col-md-6">
//                                 <div className="form-group">
//                                     <label for="email">Email Address</label>
//                                     <input type="email" id="email" name="email" className="form-control" placeholder="hello@websitename.com" required="" data-error="Please enter your Email" />
//                                     <label for="email" className="for-icon"><i className="far fa-envelope"></i></label>
//                                     <div className="help-block with-errors"></div>
//                                 </div>
//                             </div>
//                             <div className="col-md-12">
//                                 <div className="form-group">
//                                     <label for="message">Your Message</label>
//                                     <textarea name="message" id="message" className="form-control" rows="4" placeholder="Write Your message" required="" data-error="Please Write your Message"></textarea>
//                                     <div className="help-block with-errors"></div>
//                                 </div>
//                             </div>
//                             <div className="col-md-12">
//                                 <div className="form-group mb-0">
//                                     <button type="submit" className="theme-btn">
//                                         Send Me Message <i><RiMailLine size={15} /></i>
//                                     </button>
//                                     <div id="msgSubmit" className="hidden"></div>
//                                 </div>
//                             </div>
//                         </div>
//                     </form>
//                 </div>
//             </SlideUp>
//         </div>