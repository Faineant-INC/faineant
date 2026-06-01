import { Router } from "express";
import authRoutes from "./auth.routes";
import providerRoutes from "./provider.routes";
import serviceRoutes from "./service.routes";
import availabilityRoutes from "./availability.routes";
import bookingRoutes from "./booking.routes";
import paymentRoutes from "./payment.routes";
import searchRoutes from "./search.routes";
import messageRoutes from "./message.routes";
import reviewRoutes from "./review.routes";
import postRoutes from "./post.routes";
import adminRoutes from "./admin.routes";
import calendarRoutes from "./calendar.routes";
import waitlistRoutes from "./waitlist.routes";
import uploadsRoutes from "./uploads.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/providers", providerRoutes);
router.use("/services", serviceRoutes);
router.use("/availability", availabilityRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/search", searchRoutes);
router.use("/messages", messageRoutes);
router.use("/reviews", reviewRoutes);
router.use("/posts", postRoutes);
router.use("/admin", adminRoutes);
router.use("/calendar", calendarRoutes);
router.use("/waitlist", waitlistRoutes);
router.use("/uploads", uploadsRoutes);

export default router;
