"use strict";

const config = require('xin1/config');
const sendgrid = require('sendgrid')('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');
const jade = require('jade');

class Manager {
    constuctor() {

    }

    /**
     * Sends mail
     * @param {string} to Receiver
     * @param {string} subject Mail subject
     * @param {string} html Mail body
     *
     * @returns {Promise}
     */
    sendMail(to, subject, message) {
        return new Promise((resolve, reject) => {
            var email = new sendgrid.Email({
                to: to,
                subject: subject,
                from: 'info@indiringo.com',
                fromName: 'İndiringo Ekibi',
                html: message
            });

            sendgrid.send(email, function(err, json) {
                if (err) return reject(err);

                resolve();
            });
        });
    }

    sendTicket(to, params) {
        let title = 'Sayın ' + params.name + ', iletişim formunu doldurdu.'
        let message = jade.renderFile(__dirname + '/templates/contact.jade', params);
        return this.sendMail(to, title, message);
    }

    sendResetPasswordToken(to, params) {
        let title = 'Sayın ' + params.name + ', şifrenizi sıfırlamak istediniz.'
        let message = jade.renderFile(__dirname + '/templates/passwordreset.jade', params);
        return this.sendMail(to, title, message);
    }


    sendEmailVerification(to, params) {
        let title = 'Sayın ' + params.name + ', lütfen üyeliğinizi tamamlayın.'
        let message = jade.renderFile(__dirname + '/templates/emailverification.jade', params);
        return this.sendMail(to, title, message);
    }

    sendWelcome(to, params) {
        let title = 'Üyeliğiniz aktive edilmiştir.';
        let message = jade.renderFile(__dirname + '/templates/welcome.jade', params);
        return this.sendMail(to, title, message);
    }

    sendDealRejected(to, params) {
        let title = 'Üzgünüz. Teklifiniz reddedildi.';
        let message = jade.renderFile(__dirname + '/templates/dealrejected.jade', params);
        return this.sendMail(to, title, message);
    }

    sendDealApproved(to, params) {
        let title = 'Tebrikler! Teklifiniz kabul edildi.';
        let message = jade.renderFile(__dirname + '/templates/dealapproved.jade', params);
        return this.sendMail(to, title, message);
    }

    sendFreebieRejected(to, params) {
        let title = 'Üzgünüz. Ücretsiz teklifiniz reddedildi.';
        let message = jade.renderFile(__dirname + '/templates/freebierejected.jade', params);
        return this.sendMail(to, title, message);
    }

    sendFreebieApproved(to, params) {
        let title = 'Tebrikler! Ücretsiz teklifiniz kabul edildi.';
        let message = jade.renderFile(__dirname + '/templates/freebieapproved.jade', params);
        return this.sendMail(to, title, message);
    }

    sendVoucherRejected(to, params) {
        let title = 'Üzgünüz. İndirim çekiniz reddedildi.';
        let message = jade.renderFile(__dirname + '/templates/voucherrejected.jade', params);
        return this.sendMail(to, title, message);
    }

    sendVoucherApproved(to, params) {
        let title = 'Tebrikler! İndirim çekiniz kabul edildi.';
        let message = jade.renderFile(__dirname + '/templates/voucherapproved.jade', params);
        return this.sendMail(to, title, message);
    }

    sendAskRejected(to, params) {
        let title = 'Üzgünüz. Sorunuz reddedildi.';
        let message = jade.renderFile(__dirname + '/templates/askrejected.jade', params);
        return this.sendMail(to, title, message);
    }

    sendAskApproved(to, params) {
        let title = 'Tebrikler! Sorunuz kabul edildi.';
        let message = jade.renderFile(__dirname + '/templates/askapproved.jade', params);
        return this.sendMail(to, title, message);
    }

    sendCompanyDeclined(to, params) {
        let title = 'Şirket başvurunuz reddedildi.';
        let message = jade.renderFile(__dirname + '/templates/companydeclined.jade', params);
        return this.sendMail(to, title, message);
    }

    sendCommentNotification(to, params) {
        let title = params.title + ' adlı teklifinize yorum geldi.';
        let message = jade.renderFile(__dirname + '/templates/commentnotification.jade', params);
        return this.sendMail(to, title, message);
    }
};


module.exports = new Manager();
