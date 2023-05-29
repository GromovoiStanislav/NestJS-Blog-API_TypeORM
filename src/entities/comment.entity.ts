import { Entity, Column, ManyToOne } from "typeorm";
import { instanceToPlain } from "class-transformer";

import { AbstractEntity } from "./abstract-entity";
import { UserEntity } from "./user.entity";
import { ArticleEntity } from "./article.entity";
import { CommentResponse } from "src/models/comment.models";

@Entity("comments")
export class CommentEntity extends AbstractEntity {
  @Column()
  body: string;

  @ManyToOne(
    type => UserEntity,
    user => user.comments,
    { nullable: false }//eager: true,
  )
  author: UserEntity;

  @ManyToOne(
    type => ArticleEntity,
    article => article.comments,
    { nullable: false }
  )
  article: ArticleEntity;

  toJSON() {
    return <CommentResponse>instanceToPlain(this);
  }
}
