import PDFDocument from 'pdfkit';

/**
 * Generates PDF Booking Confirmation Receipt / Invoice Buffer
 */
export function generateBookingPDF(booking) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header Banner
            doc.fillColor('#0f766e')
                .fontSize(22)
                .text('AMPLR HEALTH', { align: 'left' });
            doc.fontSize(10)
                .fillColor('#64748b')
                .text('Brings Hospital Care to Your Home | Booking Confirmation & Invoice', { align: 'left' });
            doc.moveDown(1.5);

            // Divider
            doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 95).lineTo(550, 95).stroke();

            doc.moveDown(2);
            doc.fillColor('#1e293b').fontSize(16).text('BOOKING CONFIRMATION & RECEIPT', { underline: true });
            doc.moveDown(1);

            // Booking Details Table
            doc.fontSize(11).fillColor('#334155');

            const details = [
                ['Booking ID:', booking.id || 'PH-10452'],
                ['Service Name:', booking.serviceName || 'Home Healthcare Service'],
                ['Patient Name:', booking.patientName || 'Patient'],
                ['Contact Phone:', (booking.patientPhone || booking.phone ? `+${booking.patientPhone || booking.phone}` : '+91 82338 16674')],
                ['Pincode:', booking.pincode || (booking.address?.match(/\b[1-9][0-9]{5}\b/)?.[0]) || '312021'],
                ['Address / Location:', (booking.address || 'Address on file').replace(/\[LOCATION MESSAGE\]/g, '📍 Shared Location Pin')],
                ['Date & Time Slot:', `${booking.date || 'Tomorrow'} @ ${booking.slot || '3:00 PM'}`],
                ['Assigned Staff:', booking.assignedStaff ? booking.assignedStaff.name : 'Pending Allocation'],
                ['Booking Status:', booking.status || 'Confirmed'],
                ['Payment Status:', booking.paymentStatus || 'Pending'],
                ['Total Amount:', `INR ${booking.amount || 900}`]
            ];

            let y = 160;
            details.forEach(([label, value]) => {
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f766e').text(label, 50, y);
                doc.font('Helvetica').fillColor('#0f172a').text(value, 200, y);
                y += 24;
            });

            // Footer / Instructions
            y += 30;
            doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
            y += 15;
            doc.fontSize(9).fillColor('#64748b').text('Important Patient Instructions:', 50, y);
            y += 15;
            doc.text('1. Please keep your previous medical records & prescriptions handy for the visiting professional.', 50, y);
            y += 14;
            doc.text('2. A WhatsApp reminder will be dispatched 1 hour before the scheduled time slot.', 50, y);
            y += 14;
            doc.text('3. For emergency escalation, please dial 108 immediately.', 50, y);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}
