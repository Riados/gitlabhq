# frozen_string_literal: true

class SnippetsController < ApplicationController
  include RendersNotes
  include ToggleAwardEmoji
  include SpammableActions
  include SnippetsActions
  include RendersBlob
  include PreviewMarkdown
  include PaginatedCollection
  include Gitlab::NoteableMetadata

  skip_before_action :verify_authenticity_token,
    if: -> { action_name == 'show' && js_request? }

  before_action :snippet, only: [:show, :edit, :destroy, :update, :raw]

  before_action :authorize_create_snippet!, only: [:new, :create]
  before_action :authorize_read_snippet!, only: [:show, :raw]
  before_action :authorize_update_snippet!, only: [:edit, :update]
  before_action :authorize_admin_snippet!, only: [:destroy]

  skip_before_action :authenticate_user!, only: [:index, :show, :raw]

  layout 'snippets'
  respond_to :html

  def index
    if params[:username].present?
      @user = UserFinder.new(params[:username]).find_by_username!

      @snippets = SnippetsFinder.new(current_user, author: @user, scope: params[:scope])
        .execute
        .page(params[:page])
        .inc_author

      return if redirect_out_of_range(@snippets)

      @noteable_meta_data = noteable_meta_data(@snippets, 'Snippet')

      render 'index'
    else
      redirect_to(current_user ? dashboard_snippets_path : explore_snippets_path)
    end
  end

  def new
    @snippet = PersonalSnippet.new
  end

  def create
    create_params = snippet_params.merge(spammable_params)
    service_response = Snippets::CreateService.new(nil, current_user, create_params).execute
    @snippet = service_response.payload[:snippet]
    repository_operation_error = service_response.error? && !@snippet.persisted? && @snippet.valid?

    if repository_operation_error
      flash.now[:alert] = service_response.message

      render :new
    else
      move_temporary_files if @snippet.valid? && params[:files]

      recaptcha_check_with_fallback { render :new }
    end
  end

  def update
    update_params = snippet_params.merge(spammable_params)

    service_response = Snippets::UpdateService.new(nil, current_user, update_params).execute(@snippet)
    @snippet = service_response.payload[:snippet]

    check_repository_error
  end

  def show
    conditionally_expand_blob(blob)

    respond_to do |format|
      format.html do
        @note = Note.new(noteable: @snippet)
        @noteable = @snippet

        @discussions = @snippet.discussions
        @notes = prepare_notes_for_rendering(@discussions.flat_map(&:notes), @noteable)
        render 'show'
      end

      format.json do
        render_blob_json(blob)
      end

      format.js do
        if @snippet.embeddable?
          render 'shared/snippets/show'
        else
          head :not_found
        end
      end
    end
  end

  def destroy
    service_response = Snippets::DestroyService.new(current_user, @snippet).execute

    if service_response.success?
      redirect_to dashboard_snippets_path, status: :found
    elsif service_response.http_status == 403
      access_denied!
    else
      redirect_to snippet_path(@snippet),
                  status: :found,
                  alert: service_response.message
    end
  end

  protected

  # rubocop: disable CodeReuse/ActiveRecord
  def snippet
    @snippet ||= PersonalSnippet.inc_relations_for_view.find_by(id: params[:id])
  end
  # rubocop: enable CodeReuse/ActiveRecord

  alias_method :awardable, :snippet
  alias_method :spammable, :snippet

  def spammable_path
    snippet_path(@snippet)
  end

  def authorize_read_snippet!
    return if can?(current_user, :read_snippet, @snippet)

    if current_user
      render_404
    else
      authenticate_user!
    end
  end

  def authorize_update_snippet!
    return render_404 unless can?(current_user, :update_snippet, @snippet)
  end

  def authorize_admin_snippet!
    return render_404 unless can?(current_user, :admin_snippet, @snippet)
  end

  def authorize_create_snippet!
    return render_404 unless can?(current_user, :create_snippet)
  end

  def snippet_params
    params.require(:personal_snippet).permit(:title, :content, :file_name, :private, :visibility_level, :description)
  end

  def move_temporary_files
    params[:files].each do |file|
      FileMover.new(file, from_model: current_user, to_model: @snippet).execute
    end
  end
end
