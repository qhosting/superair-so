import PDFDocument from 'pdfkit';

export const generateQuotePDF = (quote, client, res) => {
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Cotizacion-${quote.id}.pdf`);

    doc.pipe(res);

    // --- Header ---
    doc.fillColor('#444444')
       .fontSize(20)
       .text('SuperAir', 50, 57)
       .fontSize(10)
       .text('Soluciones en Climatización', 200, 50, { align: 'right' })
       .text('Calle Industrial 123, Querétaro, MX', 200, 65, { align: 'right' })
       .moveDown();

    // --- Title & Details ---
    doc.fillColor('#000000')
       .fontSize(20)
       .text('COTIZACIÓN', 50, 150);

    doc.fontSize(10)
       .text(`Folio: #${quote.id}`, 50, 180)
       .text(`Fecha: ${new Date(quote.created_at).toLocaleDateString()}`, 50, 195)
       .text(`Estado: ${quote.status}`, 50, 210)

       .text(`Cliente: ${client.name}`, 300, 180)
       .text(`Atención: ${client.contact_name || client.name}`, 300, 195)
       .text(`Email: ${client.email || 'N/A'}`, 300, 210)
       .moveDown();

    // --- Table Header ---
    const tableTop = 270;
    doc.font('Helvetica-Bold');
    doc.text('Concepto', 50, tableTop);
    doc.text('Cant.', 280, tableTop, { width: 50, align: 'right' });
    doc.text('Precio Unit.', 350, tableTop, { width: 90, align: 'right' });
    doc.text('Subtotal', 450, tableTop, { width: 90, align: 'right' });

    const items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;

    let i = 0;
    doc.font('Helvetica');

    for (i = 0; i < items.length; i++) {
        const item = items[i];
        const y = tableTop + 25 + (i * 25);

        doc.text(item.productName || 'Producto', 50, y);
        doc.text(item.quantity.toString(), 280, y, { width: 50, align: 'right' });
        doc.text(`$${Number(item.price).toLocaleString('es-MX')}`, 350, y, { width: 90, align: 'right' });
        doc.text(`$${(item.quantity * item.price).toLocaleString('es-MX')}`, 450, y, { width: 90, align: 'right' });
    }

    // --- Footer ---
    const subtotal = Number(quote.total) / 1.16;
    const iva = Number(quote.total) - subtotal;
    const footerTop = tableTop + 25 + (i * 25) + 30;

    doc.font('Helvetica-Bold');
    doc.text('Subtotal:', 350, footerTop, { width: 90, align: 'right' });
    doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 450, footerTop, { width: 90, align: 'right' });

    doc.text('IVA (16%):', 350, footerTop + 15, { width: 90, align: 'right' });
    doc.text(`$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 450, footerTop + 15, { width: 90, align: 'right' });

    doc.fontSize(14).text('Total:', 350, footerTop + 35, { width: 90, align: 'right' });
    doc.text(`$${Number(quote.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 450, footerTop + 35, { width: 90, align: 'right' });

    doc.fontSize(10)
       .text('Términos de Pago: ' + (quote.payment_terms || 'Contado'), 50, footerTop + 80)
       .text('Vigencia: 15 días', 50, footerTop + 95);

    doc.end();
};
