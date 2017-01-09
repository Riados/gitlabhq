/* eslint-disable func-names, space-before-function-paren, wrap-iife, no-var, no-new, padded-blocks, max-len */
/* global GitLab */
/* global DropzoneInput */
/* global autosize */

(function() {
  this.GLForm = (function() {
    function GLForm(form) {
      this.form = form;
      this.textarea = this.form.find('textarea.js-gfm-input');
      // Before we start, we should clean up any previous data for this form
      this.destroy();
      // Setup the form
      this.setupForm();
      this.form.data('gl-form', this);
    }

    GLForm.prototype.destroy = function() {
      // Clean form listeners
      this.clearEventListeners();
      return this.form.data('gl-form', null);
    };

    GLForm.prototype.setupForm = function() {
      var isNewForm;
      isNewForm = this.form.is(':not(.gfm-form)');
      this.form.removeClass('js-new-note-form');
      if (isNewForm) {
        this.form.find('.div-dropzone').remove();
        this.form.addClass('gfm-form');
        // remove notify commit author checkbox for non-commit notes
        gl.utils.disableButtonIfEmptyField(this.form.find('.js-note-text'), this.form.find('.js-comment-button'));
        gl.GfmAutoComplete.setup(this.form.find('.js-gfm-input'));
        new DropzoneInput(this.form);
        autosize(this.textarea);
        // form and textarea event listeners
        this.addEventListeners();
      }
      gl.text.init(this.form);
      // hide discard button
      this.form.find('.js-note-discard').hide();
      return this.form.show();
    };

    GLForm.prototype.clearEventListeners = function() {
      this.textarea.off('focus.addFocus');
      this.textarea.off('blur.removeFocus');
      return gl.text.removeListeners(this.form);
    };

    GLForm.prototype.addEventListeners = function() {
      this.textarea.off('focus.addFocus').on('focus.addFocus', function() {
        return $(this).closest('.md-area').addClass('is-focused');
      });
      return this.textarea.off('blur.removeFocus').on('blur.removeFocus', function() {
        return $(this).closest('.md-area').removeClass('is-focused');
      });
    };

    return GLForm;

  })();

}).call(this);
