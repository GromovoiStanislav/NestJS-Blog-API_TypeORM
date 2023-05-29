import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CommentEntity } from "src/entities/comment.entity";
import { UserEntity } from "src/entities/user.entity";
import { CreateCommentDTO, CommentResponse } from "src/models/comment.models";
import { ArticleService } from "./article.service";

@Injectable()
export class CommentsService {

  constructor(
    @InjectRepository(CommentEntity) private commentRepo: Repository<CommentEntity>,
    private articleService: ArticleService
  ) {
  }


  findByArticleSlug(slug: string): Promise<CommentResponse[]> {
    return this.commentRepo.find({
      where: { article: { slug: slug } },
      relations: ["article"]
    });
  }


  findById(id: number): Promise<CommentResponse> {
    return this.commentRepo.findOneBy({ id });
  }


  async createComment(
    user: UserEntity,
    slug: string,
    data: CreateCommentDTO
  ): Promise<CommentResponse> {

    const article = await this.articleService.findBySlug(slug);
    if (!article) {
      throw new NotFoundException();
    }

    const comment = this.commentRepo.create(data);
    comment.author = user;
    comment.article = article;
    await comment.save();
    return this.findById(comment.id);
  }


  async deleteComment(
    user: UserEntity,
    slug: string,
    id: number
  ): Promise<CommentResponse> {
    const comment = await this.commentRepo.findOne({
      where: { id, author: { id: user.id }, article: { slug } }
    });
    if (!comment) {
      throw new NotFoundException();
    }
    await comment.remove();
    return comment;
  }

}
